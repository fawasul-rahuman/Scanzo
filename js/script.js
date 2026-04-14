const output = document.getElementById("output");

function generateQR() {
	output.innerHTML = "";

	const data = document.getElementById("data").value;

	const qr = new QRCodeStyling({
		width: 500,
		height: 500,
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
