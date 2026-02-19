"""Deploy config for the CredentialVerifier contract."""
import logging

import algokit_utils

logger = logging.getLogger(__name__)


def deploy() -> None:
    """Deploy CredentialVerifier to the network."""
    from smart_contracts.artifacts.credential_verifier.credential_verifier_client import (  # noqa: E501
        CredentialVerifierFactory,
    )

    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer = algorand.account.from_environment("DEPLOYER")

    factory = algorand.client.get_typed_app_factory(
        CredentialVerifierFactory, default_sender=deployer.address
    )

    app_client, result = factory.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
    )

    if result.operation_performed in [
        algokit_utils.OperationPerformed.Create,
        algokit_utils.OperationPerformed.Replace,
    ]:
        # Fund the contract so it can pay inner-txn fees and hold minimum balance
        # for box storage (2500 µAlgo per box + 400 µAlgo per byte).
        algorand.send.payment(
            algokit_utils.PaymentParams(
                amount=algokit_utils.AlgoAmount(algo=2),
                sender=deployer.address,
                receiver=app_client.app_address,
            )
        )
        logger.info(
            f"Deployed CredentialVerifier with app_id={app_client.app_id}, "
            f"address={app_client.app_address}"
        )
    else:
        logger.info(
            f"CredentialVerifier already deployed: app_id={app_client.app_id}"
        )
