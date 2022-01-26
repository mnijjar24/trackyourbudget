//Register the service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").then((reg) => {
      console.log("Service worker registered.", reg);
    });
  });
}

let transactions = [];
let myChart;
const transactionForm = createTransactionForm();
const transactionApi = createTransactionApi();

initTransactions();

document.querySelector("#add-btn").onclick = function() {
  sendTransaction(true);
};

document.querySelector("#sub-btn").onclick = function() {
  sendTransaction(false);
};

function createTransactionForm() {
  const nameEl = document.querySelector("#t-name");
  const amountEl = document.querySelector("#t-amount");
  const errorEl = document.querySelector(".form .error");

  const showError = (message) => {
    errorEl.textContent = message;
  };

  //return false if invalid and display validation
  const validate = () => {
    if (nameEl.value === "" || amountEl.value === "") {
      showError("Missing information.");
      return false;
    }
    showError("");
    return true;
  };

  //return transaction object from form
  const transaction = () => {
    return {
      name: nameEl.value,
      value: amountEl.value,
      date: new Date().toISOString()
    };
  };

  //clear form
  const clear = () => {
    nameEl.value = "";
    amountEl.value = "";
    showError("");
  };

  return Object.freeze({ transaction, validate, clear, showError });
}

function createTransactionApi() {
  const create = (transaction) => {
    return fetch("/api/transaction", {
      method: "POST",
      body: JSON.stringify(transaction),
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json"
      }
    }).then((response) => {
      return response.json();
    });
  };
  
  const fetchAll = () => {
    return fetch("/api/transaction").then((response) => {
      return response.json();
    });
  };
  return Object.freeze({ create, fetchAll });
}

function initTransactions() {
  transactionApi.fetchAll().then((data) => {
    // saves db data on global variable
    transactions = data;

    renderTransactionsChart();
  });
}

function sendTransaction(isAdding) {
  if (!transactionForm.validate()) {
    return;
  }

  //create record
  const transaction = transactionForm.transaction();

  //if subtracting funds, convert amount to negative number
  if (!isAdding) {
    transaction.value *= -1;
  }

  //add to beginning of current array
  transactions.unshift(transaction);

  //rerun logic to populate ui with new record
  populateChart();
  populateTable();
  populateTotal();

  //send to server
  transactionApi
    .create(transaction)
    .then((data) => {
      if (data.errors) {
        transactionForm.showError("Missing information.");
      } else {
        transactionForm.clear();
      }
    })
    .catch(() => {
      //fetch failed, saved to indexedDB
      saveRecord(transaction);
      transactionForm.clear();
    });
}

function renderTransactionsChart() {
  populateTotal();
  populateTable();
  populateChart();
}

function populateTotal() {
  // reduce transaction amounts to a single total value
  const total = transactions.reduce((total, t) => {
    return total + parseInt(t.value);
  }, 0);

  let totalEl = document.querySelector("#total");
  totalEl.textContent = total;
}

function populateTable() {
  const tbody = document.querySelector("#tbody");
  tbody.innerHTML = "";

  transactions.forEach(transaction => {
    // create and populate a table row
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${transaction.name}</td>
      <td>${transaction.value}</td>
    `;

    tbody.appendChild(tr);
  });
}

function populateChart() {
  // copy array and reverse it
  const reversed = transactions.slice().reverse();
  let sum = 0;

  // create date labels for chart
  const labels = reversed.map(t => {
    const date = new Date(t.date);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  });

  // create incremental values for chart
  const data = reversed.map(t => {
    sum += parseInt(t.value);
    return sum;
  });

  // remove old chart if it exists
  if (myChart) {
    myChart.destroy();
  }

  const ctx = document.getElementById("myChart").getContext("2d");

  myChart = new Chart(ctx, {
    type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: "Total Over Time",
            fill: true,
            backgroundColor: "#6666ff",
            data
          }
        ]
    }
  });
}