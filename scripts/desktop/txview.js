var TransactionView = function (container) {
	this.db = null;
	this.mem = null;
	this.wallet = null;
	this.blockHeight = 0;
	this.container = container;

	this.updateHandler = $.proxy(this.handleUpdate, this);
};

TransactionView.prototype.setDatabase = function (db) {
	if (this.db) {
		$(this.db).unbind('update', this.updateHandler);
	}
	this.db = db;
	$(this.db).bind('update', this.updateHandler);

	// Trigger manual update
	this.updateHandler();
};

TransactionView.prototype.setMemPool = function (mem) {
	if (this.mem) {
		$(this.mem).unbind('update', this.updateHandler);
	}
	this.mem = mem;
	$(this.mem).bind('update', this.updateHandler);

	// Trigger manual update
	this.updateHandler();
};

TransactionView.prototype.setWallet = function (wallet) {
	this.wallet = wallet;

	// Trigger update
	this.updateHandler();
};

TransactionView.prototype.setBlockHeight = function (height) {
	this.blockHeight = height;

	// Trigger update
	this.updateHandler();
};

TransactionView.prototype.handleUpdate = function () {
	var self = this;

	var txs = [];
	if (this.db) {
		txs = txs.concat(this.db.getTransactions());
	}
	if (this.mem) {
		txs = txs.concat(this.mem.getTransactions());
	}

	txs = txs.reverse();

	html = new EJS({url: 'views/txs.ejs'}).render({
		self: self,
		txs: txs,
		wallet: self.wallet,
		blockHeight: self.blockHeight
	});
	this.container.html(html);

	this.container.find('tbody td.detail img').click(function (e) {
		var index = $(e.currentTarget).parent().parent().data('index');
		var html = new EJS({url: 'views/txdetail.ejs'}).render({
			self: self,
			tx: txs[index],
			hash: Crypto.util.bytesToHex(Crypto.util.base64ToBytes(txs[index].hash).reverse()),
			impact: txs[index].calcImpact(self.wallet),
			wallet: self.wallet,
			blockHeight: self.blockHeight
		});
		var dialog = $('<div></div>')
		.html(html)
		.dialog({
			autoOpen: true,
			title: 'Transaction Details',
			width: 600
		});
	});
};
