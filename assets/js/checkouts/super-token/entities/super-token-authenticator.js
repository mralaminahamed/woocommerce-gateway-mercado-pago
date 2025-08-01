/* globals wc_mercadopago_supertoken_authenticator_params */
/* eslint-disable no-unused-vars */
class MPSuperTokenAuthenticator {
    AMOUNT_ELEMENT_ID = 'mp-amount';
    PLATFORM_ID = wc_mercadopago_supertoken_authenticator_params.platform_id;

    // Attributes
    ableToUseSuperToken = null;
    amountUsed = null;
    authenticator = null;
    userClosedModal = false;

    // Dependencies
    mpSdkInstance = null;
    mpSuperTokenPaymentMethods = null;
    mpSuperTokenMetrics = null;

    constructor(mpSdkInstance, mpSuperTokenPaymentMethods, mpSuperTokenMetrics) {
        this.mpSdkInstance = mpSdkInstance;
        this.mpSuperTokenPaymentMethods = mpSuperTokenPaymentMethods;
        this.mpSuperTokenMetrics = mpSuperTokenMetrics;
    }

    getAmountUsed() {
        return this.amountUsed;
    }

    isUserModalClosure(error) {
        return error?.errorCode === 'NO_BOTTOMSHEET_CONFIRMATION';
    }

    storeUserClosedModal() {
        this.userClosedModal = true;
    }

    isUserClosedModal() {
        return this.userClosedModal;
    }

    async buildAuthenticator(amount, buyerEmail) {
        this.amountUsed = amount;

        const authenticator = await this.mpSdkInstance
            .authenticator(amount, buyerEmail, { platformId: this.PLATFORM_ID });

        return authenticator;
    }

    async canUseSuperTokenFlow(amount, buyerEmail) {
        try {
            const authenticator = await this.buildAuthenticator(amount, buyerEmail);

            this.ableToUseSuperToken = true;
            this.mpSuperTokenMetrics.canUseSuperToken(true);

            return !!authenticator;
        } catch (error) {
            this.ableToUseSuperToken = false;
            return false;
        }
    }

    async renderAccountPaymentMethods(token) {
        try {
            const accountPaymentMethods = await this.mpSuperTokenPaymentMethods.getAccountPaymentMethods(token);

            if (!accountPaymentMethods?.data.length) {
                throw new Error('No payment methods found');
            }

            this.mpSuperTokenPaymentMethods.renderAccountPaymentMethods(accountPaymentMethods.data, this.amountUsed);
        } catch (error) {
            this.mpSuperTokenMetrics.errorToRenderAccountPaymentMethods(error);
        }
    }

    async showAuthenticator(authenticator) {
        try {
            const token = await authenticator.show();

            await this.renderAccountPaymentMethods(token);
        } catch (error) {
            if (this.isUserModalClosure(error)) {
                this.storeUserClosedModal();
            }

            this.mpSuperTokenMetrics.errorToShowAuthenticator(error);
        }
    }

    async authenticate(amount, buyerEmail) {
        if (this.ableToUseSuperToken === false) return;

        const authenticator = await this.buildAuthenticator(amount, buyerEmail);

        this.mpSuperTokenMetrics.canUseSuperToken(true);

        await this.showAuthenticator(authenticator);
    }
}
