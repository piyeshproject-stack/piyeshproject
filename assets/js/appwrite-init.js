// ============================================================
// assets/js/appwrite-init.js  —  Appwrite SDK Initialization
// ============================================================
// config.js এ DB_PROVIDER = 'appwrite' এবং credentials set করলে এটা কাজ করবে
// ============================================================

(function () {
    if (typeof CONFIG === 'undefined' || CONFIG.DB_PROVIDER !== 'appwrite') return;

    var client = new Appwrite.Client()
        .setEndpoint(CONFIG.APPWRITE_ENDPOINT)
        .setProject(CONFIG.APPWRITE_PROJECT);

    window.appwriteDatabases = new Appwrite.Databases(client);
    window.appwriteAccount   = new Appwrite.Account(client);
    window.APP_DB            = CONFIG.APPWRITE_DATABASE_ID;
    window.AppwriteQuery     = Appwrite.Query;
    window.AppwriteID        = Appwrite.ID;
})();
