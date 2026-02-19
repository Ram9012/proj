
from algopy import (
    ARC4Contract,
    String,
    UInt64,
    Account,
    Global,
    Txn,
    itxn,
    GlobalState,
    BoxMap,
    arc4,
    subroutine,
)

class CredentialVerifier(ARC4Contract):
    def __init__(self) -> None:
        # The University's address (defaults to creator)
        self.admin = GlobalState(Global.creator_address)
        # Track if a specific certificate (Asset ID) has been invalidated
        self.is_revoked = BoxMap(UInt64, bool, key_prefix=b"rev_")

    @subroutine
    def _assert_admin(self) -> None:
        assert Txn.sender == self.admin.value, "Only the admin can call this method"

    @arc4.abimethod
    def issue_credential(
        self,
        student_address: Account,
        asset_name: String,
        unit_name: String,
        ipfs_url: String,
    ) -> UInt64:
        """
        Mint a non-transferable NFT certificate for a student.
        Only callable by the admin. Sets manager, freeze, and clawback to the contract address 
        so the student can never transfer or sell the credential.
        Returns the newly created Asset ID.
        """
        self._assert_admin()

        # Inner transaction: create the ASA
        asset_create_txn = itxn.AssetConfig(
            total=1,
            decimals=0,
            default_frozen=False,
            unit_name=unit_name,
            asset_name=asset_name,
            url=ipfs_url,
            # Lock the asset: only the contract can manage / freeze / clawback
            manager=Global.current_application_address,
            freeze=Global.current_application_address,
            clawback=Global.current_application_address,
            # Reserve to student shows ownership provenance in the ASA metadata
            reserve=student_address,
            fee=0,
        ).submit()

        created_asset_id = asset_create_txn.created_asset.id

        # Initialise revocation flag to False
        self.is_revoked[created_asset_id] = False

        return created_asset_id

    @arc4.abimethod
    def transfer_to_student(self, asset: UInt64, student: Account) -> None:
        """
        Transfer the minted NFT from the contract to the student.
        Pre-condition: the student must have opted-in to the ASA beforehand. 
        Only callable by the admin.
        """
        self._assert_admin()

        # Verify the asset was not already revoked
        assert asset in self.is_revoked, "Unknown credential asset"
        assert not self.is_revoked[asset], "Cannot transfer a revoked credential"

        itxn.AssetTransfer(
            xfer_asset=asset,
            asset_receiver=student,
            asset_amount=1,
            fee=0,
        ).submit()

    @arc4.abimethod
    def revoke_credential(self, asset: UInt64, student: Account) -> None:
        """
        Revoke a credential:
        1. Freeze the student's holding via an inner AssetFreeze txn.
        2. Clawback the asset back to the contract via an inner AssetTransfer.
        3. Mark the credential as revoked in Box storage.
        Only callable by the admin.
        """
        self._assert_admin()

        assert asset in self.is_revoked, "Unknown credential asset"
        assert not self.is_revoked[asset], "Credential is already revoked"

        # Step 1 – freeze the student's account for this asset
        itxn.AssetFreeze(
            freeze_asset=asset,
            freeze_account=student,
            frozen=True,
            fee=0,
        ).submit()

        # Step 2 – clawback the asset from the student back to the contract
        itxn.AssetTransfer(
            xfer_asset=asset,
            asset_sender=student,  # clawback source
            asset_receiver=Global.current_application_address,
            asset_amount=1,
            fee=0,
        ).submit()

        # Step 3 – mark as revoked in box storage (permanent, on-chain record)
        self.is_revoked[asset] = True

    @arc4.abimethod(readonly=True)
    def get_issuer_info(self) -> Account:
        """
        Return the university admin address.
        Readonly (no state change). Frontends can call this to verify the issuer 
        of any certificate minted by this contract.
        """
        return Account(self.admin.value)
