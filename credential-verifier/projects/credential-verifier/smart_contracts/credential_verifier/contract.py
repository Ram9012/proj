"""
Decentralized Academic Credential Verifier
==========================================
University (Admin) issues non-transferable NFT certificates to students as ASAs.

Key design choices:
- manager / freeze / clawback are all set to the CONTRACT ADDRESS, not the admin's
  wallet, so the student can never transfer or sell their credential.
- Revocation freezes + claws back the asset and records it in Box storage so
  any off-chain verifier can query on-chain.
- Box storage keys are the UInt64 asset ID; value is a Bool (True == revoked).
"""

from algopy import (
    Account,
    ARC4Contract,
    Asset,
    BoxMap,
    Global,
    GlobalState,
    Txn,
    UInt64,
    arc4,
    itxn,
    subroutine,
)
from algopy.arc4 import abimethod


class CredentialVerifier(ARC4Contract):
    # ------------------------------------------------------------------ #
    # State                                                                #
    # ------------------------------------------------------------------ #

    # The university / issuing authority address.
    # Defaults to the account that deploys the contract.
    admin: GlobalState[Account]

    # Box map: asset_id (UInt64) → is_revoked (Bool)
    # Stored in boxes so any party can query without an opt-in.
    is_revoked: BoxMap[UInt64, arc4.Bool]

    # ------------------------------------------------------------------ #
    # Lifecycle                                                            #
    # ------------------------------------------------------------------ #

    def __init__(self) -> None:
        self.admin = GlobalState(Txn.sender, key=b"admin")
        self.is_revoked = BoxMap(UInt64, arc4.Bool, key_prefix=b"rev_")

    # ------------------------------------------------------------------ #
    # Helpers                                                              #
    # ------------------------------------------------------------------ #

    @subroutine
    def _assert_admin(self) -> None:
        """Revert unless the current transaction sender is the admin."""
        assert Txn.sender == self.admin.value, "Only the admin can call this method"

    # ------------------------------------------------------------------ #
    # ABI Methods                                                          #
    # ------------------------------------------------------------------ #

    @abimethod()
    def issue_credential(
        self,
        student_address: arc4.Address,
        asset_name: arc4.String,
        unit_name: arc4.String,
        ipfs_url: arc4.String,
    ) -> arc4.UInt64:
        """
        Mint a non-transferable NFT certificate for a student.

        Only callable by the admin.
        Sets manager, freeze, and clawback to the contract address so the
        student can never transfer or sell the credential.

        Returns the newly created Asset ID.
        """
        self._assert_admin()

        # Inner transaction: create the ASA.
        # .submit() returns an AssetConfigInnerTransaction object.
        asset_create_txn = itxn.AssetConfig(
            total=1,
            decimals=0,
            default_frozen=False,
            unit_name=unit_name.native,
            asset_name=asset_name.native,
            url=ipfs_url.native,
            # Lock the asset: only the contract can manage / freeze / clawback
            manager=Global.current_application_address,
            freeze=Global.current_application_address,
            clawback=Global.current_application_address,
            # Reserve to student shows ownership provenance in the ASA metadata
            reserve=student_address.native,
            fee=0,
        ).submit()

        # Access the created asset from the inner txn result
        created_asset_id = asset_create_txn.created_asset.id

        # Initialise revocation flag to False
        self.is_revoked[created_asset_id] = arc4.Bool(False)

        return arc4.UInt64(created_asset_id)

    @abimethod()
    def transfer_to_student(
        self,
        asset: Asset,
        student: arc4.Address,
    ) -> None:
        """
        Transfer the minted NFT from the contract to the student.

        Pre-condition: the student must have opted-in to the ASA beforehand.
        Only callable by the admin.
        """
        self._assert_admin()

        # Verify the asset was not already revoked
        revoked, exists = self.is_revoked.maybe(asset.id)
        assert exists, "Unknown credential asset"
        assert not revoked.native, "Cannot transfer a revoked credential"

        itxn.AssetTransfer(
            xfer_asset=asset,
            asset_receiver=student.native,
            asset_amount=1,
            fee=0,
        ).submit()

    @abimethod(readonly=True)
    def get_issuer_info(self) -> arc4.Address:
        """
        Return the university admin address.

        Readonly (no state change). Frontends can call this to verify the
        issuer of any certificate minted by this contract.
        """
        return arc4.Address(self.admin.value)

    @abimethod()
    def revoke_credential(
        self,
        asset: Asset,
        student: arc4.Address,
    ) -> None:
        """
        Revoke a credential:
          1. Freeze the student's holding via an inner AssetFreeze txn.
          2. Clawback the asset back to the contract via an inner AssetTransfer.
          3. Mark the credential as revoked in Box storage.

        Only callable by the admin.
        """
        self._assert_admin()

        revoked, exists = self.is_revoked.maybe(asset.id)
        assert exists, "Unknown credential asset"
        assert not revoked.native, "Credential is already revoked"

        # Step 1 – freeze the student's account for this asset
        itxn.AssetFreeze(
            freeze_asset=asset,
            freeze_account=student.native,
            frozen=True,
            fee=0,
        ).submit()

        # Step 2 – clawback the asset from the student back to the contract
        itxn.AssetTransfer(
            xfer_asset=asset,
            asset_sender=student.native,          # clawback source
            asset_receiver=Global.current_application_address,
            asset_amount=1,
            fee=0,
        ).submit()

        # Step 3 – mark as revoked in box storage (permanent, on-chain record)
        self.is_revoked[asset.id] = arc4.Bool(True)
