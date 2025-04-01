const currencyToCountryCode = {
    USD: "us", EUR: "eu", GBP: "gb", INR: "in", JPY: "jp",
    CAD: "ca", AUD: "au", CHF: "ch", CNY: "cn", KRW: "kr"
};

window.addEventListener('DOMContentLoaded', () => {
    const fromSelect = document.getElementById('fromCurrency');
    const toSelect = document.getElementById('toCurrency');

    fetch('https://api.frankfurter.app/currencies')
        .then(response => response.json())
        .then(data => {
            const currencies = Object.keys(data).sort();

            currencies.forEach(currency => {
                const option1 = document.createElement('option');
                const option2 = document.createElement('option');
                option1.value = option2.value = currency;
                option1.textContent = option2.textContent = `${currency} - ${data[currency]}`;
                fromSelect.appendChild(option1);
                toSelect.appendChild(option2);
            });

            fromSelect.value = 'USD';
            toSelect.value = 'EUR';
            updateFlags('USD', 'EUR');
        })
        .catch(err => {
            console.error('Failed to load currencies:', err);
        });
});

document.getElementById('convertBtn').addEventListener('click', function () {
    const amount = document.getElementById('amount').value;
    const fromCurrency = document.getElementById('fromCurrency').value;
    const toCurrency = document.getElementById('toCurrency').value;

    if (amount === '' || isNaN(amount)) {
        alert('Please enter a valid amount.');
        return;
    }

    updateFlags(fromCurrency, toCurrency);

    fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`)
        .then(response => response.json())
        .then(data => {
            const rate = data.rates[toCurrency];
            const convertedAmount = (amount * rate).toFixed(2);
            document.getElementById('result').textContent =
                `${amount} ${fromCurrency} = ${convertedAmount} ${toCurrency}`;
        })
        .catch(error => {
            console.error('Error fetching exchange rates:', error);
            document.getElementById('result').textContent = 'Error fetching exchange rates.';
        });

    fetchHistoricalRates(fromCurrency, toCurrency);
});

function updateFlags(from, to) {
    const fromFlag = document.getElementById('fromFlag');
    const toFlag = document.getElementById('toFlag');

    const fromCode = currencyToCountryCode[from];
    const toCode = currencyToCountryCode[to];

    fromFlag.src = fromCode ? `https://flagcdn.com/24x18/${fromCode}.png` : '';
    toFlag.src = toCode ? `https://flagcdn.com/24x18/${toCode}.png` : '';
}

function fetchHistoricalRates(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
        console.log("Same currency selected — skipping chart.");
        if (chart) chart.destroy();
        document.getElementById("percentChange").textContent = '';
        return;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const formatDate = (d) => d.toISOString().split('T')[0];
    const formattedEnd = formatDate(endDate);
    const formattedStart = formatDate(startDate);

    const url = `https://api.frankfurter.app/${formattedStart}..${formattedEnd}?from=${fromCurrency}&to=${toCurrency}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const labels = Object.keys(data.rates);
            const values = labels.map(date => data.rates[date][toCurrency]);
            drawChart(labels, values, fromCurrency, toCurrency);
        })
        .catch(err => {
            console.error('Historical data fetch failed:', err);
        });
}

let chart;
function drawChart(labels, values, from, to) {
    const ctx = document.getElementById('rateChart').getContext('2d');
    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: `Exchange Rate: ${from} to ${to}`,
                data: values,
                fill: false,
                borderColor: 'rgba(57, 122, 128, 1)',
                tension: 0.3,
                pointBackgroundColor: 'rgba(57, 122, 128, 1)',
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true },
                tooltip: { enabled: true }
            },
            scales: {
                y: {
                    ticks: {
                        callback: function (value) {
                            return value.toFixed(3);
                        }
                    }
                }
            }
        }
    });

    const startRate = values[0];
    const endRate = values[values.length - 1];
    const percentChange = ((endRate - startRate) / startRate * 100).toFixed(2);

    const changeElement = document.getElementById("percentChange");
    if (percentChange > 0) {
        changeElement.textContent = `📈 ${from} gained ${percentChange}% vs ${to} over the past 7 days`;
        changeElement.style.color = "green";
    } else if (percentChange < 0) {
        changeElement.textContent = `📉 ${from} dropped ${Math.abs(percentChange)}% vs ${to} over the past 7 days`;
        changeElement.style.color = "red";
    } else {
        changeElement.textContent = `➖ No change in exchange rate between ${from} and ${to}`;
        changeElement.style.color = "#333";
    }
}
