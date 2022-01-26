const indexedDB = 
    window.indexedDB ||
    window.mozIndexedDB ||
    window.webkitIndexedDB ||
    window.msIndexedDB ||
    window.shimIndexedDB;

let db;
// creates a new db request for the budget database -> update this to use whatever your mongoose atlas name is
const request = indexedDB.open("easy-budget-tracker", 1);

request.onupgradeneeded = (event) => {
    // creates object store called pending while setting autoIncrement to true
    const db = event.target.result;
    db.createObjectStore("pending", { autoIncrement: true });
};

request.onsuccess = (event) => {
    db = event.target.result;

    //checks if app is online before reading the db
    if (navigator.onLine) {
        checkDatabase();
    }
};

request.onerror = (event) => {
    console.log("Uh oh! " + event.target.errorCode);
};

const saveRecord = (record) => {
    //creates a transaction on the pending db with readwrite access
    const transaction = db.transaction(["pending"], "readwrite");

    //access your pending object store
    const store = transaction.objectStore("pending");

    //add record to your store with add method
    store.add(record);
}

const checkDatabase = () => {
    //open a transaction on your pending datebase
    const transaction = db.transaction(["pending"], "readwrite");
    //access your pending object store
    const store = transaction.objectStore("pending");
    //get all records from store and set them to a variable
    const getAll = store.getAll();

    getAll.onsuccess = () => {
        if (getAll.result.length > 0) {
            fetch("/api/transatction/bulk", {
                method: "POST",
                body: JSON.stringify(getAll.result),
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Content-Type": "application/json"
                }
            })
            .then(response => response.json())
            .then(() => {
                //if successful, opens a transaction on your pending database
                const transaction = db.transaction(["pending"], "readwrite");

                //access your pending object store
                const store = transaction.objectStore("pending");

                //clear the items in the store
                store.clear();
            });
        }
    };
}

window.addEventListener("online", checkDatabase);