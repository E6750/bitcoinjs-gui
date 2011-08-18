define(['../txview'], function (TransactionView) {
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

    var txObjs = [];
    for (var i = 0, l = txs.length; i < l; i++ ) {
      var tx = txs[i];

		  var confirmations = tx.block ? this.blockHeight - tx.block.height + 1 : 0;
      var analysis = tx.analyze(this.wallet);

      var date = new Date(tx.timestamp * 1000);
      var today = new Date();

      var isToday =
        date.getDate() == today.getDate() &&
        date.getMonth() == today.getMonth() &&
        date.getFullYear() == today.getFullYear();

      var dateString;
      if (isToday) {
        var hours = date.getHours();
        var suffix = hours >= 12 ? " PM" : " AM";
        if (hours >= 12) hours = hours - 12;
        hours = hours == 0 ? 12 : hours;
        var mins = ""+date.getMinutes();
        mins = (mins.length == 1) ? "0" + mins : mins;

        dateString = "" + hours + ":" + mins + suffix;
      } else {
        dateString = "" + date.getMonth()+"/"+date.getDate()+"/"+date.getFullYear();
      }

      var symbol;
      var addr = "";
      switch (analysis.type) {
      case 'recv':
        symbol = "&#8592;";
        addr = ""+analysis.addr;
        break;

      case 'sent':
			  symbol = "&#8594;";
        addr = ""+analysis.addr;
        break;

      case 'self':
			  symbol = "&#10227;";
        break;

      case 'other':
      default:
			  symbol = "?";
      }

      var impact = analysis.impact.sign == -1 ? "- " : "+ ";
      impact += Bitcoin.Util.formatValue(analysis.impact.value);

      txObjs.push({
        status: confirmations ? "confirmed" : "unconfirmed",
        symbol: symbol,
        addr: addr,
        date: dateString,
        impact: impact
      });
    }
    this.container.loadData(txObjs);
  };

  return TransactionView;
});
