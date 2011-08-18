define(function () {
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

  return TransactionView;
});
