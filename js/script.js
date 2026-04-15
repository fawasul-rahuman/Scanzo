const output = document.getElementById("output");

let qr;
let countdownInterval;

/* ================= ALERT SYSTEM ================= */

function showAlert(message) {
	const box = document.getElementById("alertBox");
	const msg = document.getElementById("alertMessage");

	msg.textContent = message;
	box.classList.add("active");
}

function closeAlert() {
	document.getElementById("alertBox").classList.remove("active");

	// stop countdown if closed manually
	if (countdownInterval) {
		clearInterval(countdownInterval);
	}
}

/* ================= GENERATE ================= */

function generateQR() {
	output.innerHTML = "";

	const data = document.getElementById("data").value;

	if (!data) return showAlert("Enter some text!");

	qr = new QRCodeStyling({
		width: 450,
		height: 450,
		data: data,
		dotsOptions: {
			color: "#000",
			type: "square",
		},
		backgroundOptions: {
			color: "#fff",
		},
	});

	const container = document.createElement("div");
	output.appendChild(container);
	qr.append(container);
}

/* ================= DOWNLOAD WITH TIMER ================= */

function downloadQR() {
	if (!qr) return showAlert("Generate QR first!");

	let timeLeft = 5;

	showAlert(`Downloading in ${timeLeft} sec...`);

	countdownInterval = setInterval(() => {
		timeLeft--;

		if (timeLeft > 0) {
			showAlert(`Downloading in ${timeLeft} sec...`);
		} else {
			clearInterval(countdownInterval);
			closeAlert();

			// 🔥 Start download after 5 sec
			qr.download({
				name: "qr-code",
				extension: "png",
			});
		}
	}, 1000);
}

/* ================= COPY ================= */

function copyQR() {
	if (!qr) return showAlert("Generate QR first!");

	const canvas = output.querySelector("canvas");

	if (!canvas) return showAlert("QR not ready!");

	canvas.toBlob(blob => {
		navigator.clipboard.write([
			new ClipboardItem({ "image/png": blob })
		]).then(() => {
			showAlert("QR copied!");
			setTimeout(closeAlert, 2000);
		}).catch(() => {
			showAlert("Copy failed!");
		});
	});
}