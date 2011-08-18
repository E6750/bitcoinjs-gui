define(["jquery"], function ($) {
  return function (cfg, wm, txDb, txMem, txView, exitNode) {
	  txView.setDatabase(txDb);
	  txView.setMemPool(txMem);

	  $(cfg).bind('settingChange', function (e) {
		  switch (e.key) {
		  case 'exitNodeHost':
		  case 'exitNodePort':
			  exitNode.disconnect();
			  exitNode.setSocket(cfg.get('exitNodeHost'),
							             cfg.get('exitNodePort'));
			  exitNode.connect();
			  break;
		  }
	  });

	  $(wm).bind('walletInit', function (e) {
	    txView.setWallet(e.newWallet.wallet);
		  exitNode.connect(e.newWallet.wallet);
	  });

	  $(wm).bind('walletDeinit', function (e) {
      txDb.clear();
      txMem.clear();
      if (e.oldWallet) {
        e.oldWallet.wallet.clearTransactions();
      }
		  exitNode.disconnect();
	  });

	  $(exitNode).bind('blockInit blockAdd blockRevoke', function (e) {
		  txView.setBlockHeight(e.height);
	  });

	  $(exitNode).bind('txData', function (e) {
		  for (var i = 0; i < e.txs.length; i++) {
			  if (wm.activeWallet) {
          wm.activeWallet.wallet.process(e.txs[i]);
        }
		  }
		  if (e.confirmed) {
			  txDb.loadTransactions(e.txs);
		  } else {
			  txMem.loadTransactions(e.txs);
		  }
	  });

	  $(exitNode).bind('txAdd', function (e) {
		  txDb.addTransaction(e.tx);
		  txMem.removeTransaction(e.tx.hash);
	  });

	  $(exitNode).bind('txNotify', function (e) {
		  console.log('txNotify', e);
			if (wm.activeWallet) {
        wm.activeWallet.wallet.process(e.tx);
      }
		  txMem.addTransaction(e.tx);
	  });
  };
});
