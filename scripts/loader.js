define(
  ["require", "./scripts/vendor/sencha-touch-1.1.0/sencha-touch.js"],
  function (require) {
    if (Ext.is.Tablet && Ext.is.Phone) {
      require(["./tablet/index"]);
    } else {
      require(["./desktop/index"]);
    }
  }
);
