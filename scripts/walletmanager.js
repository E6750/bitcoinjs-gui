var WalletManager = function (wallet) {
	this.wallet = wallet;
	this.walletActive = false;
};

WalletManager.prototype.init = function () {
	if (this.wallet.loadLocal()) {
		this.walletActive = true;
		$(this).trigger('walletInit');
	}
};

WalletManager.prototype.createWallet = function () {
	var self = this;

	// Send a notification that this wallet is going to be disabled
	if (self.walletActive) {
		$(self).trigger('walletDeinit');
		self.wallet.clear();
	}

	// Create the new wallet
	self.walletActive = true;
	self.wallet.initNew(function (n, total) {
		if (n >= total) {
			self.wallet.save();
			$(self).trigger('walletInit');
		} else {
			$(self).trigger('walletProgress', {n: n, total: total});
		}
	});
};
