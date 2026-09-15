function randomChunk(len: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function generateConfirmation(mode: "air" | "ocean") {
  const trackingNumber = `HL${randomChunk(10)}`;
  const pickupConfirmationNumber = `PU-${randomChunk(8)}`;
  const waybillNumber =
    mode === "air" ? `AWB-${randomChunk(11)}` : `SWB-${randomChunk(11)}`;

  const delivery = new Date();
  delivery.setDate(delivery.getDate() + (mode === "air" ? 4 : 14));

  return {
    expectedDelivery: delivery.toISOString(),
    trackingNumber,
    pickupConfirmationNumber,
    waybillNumber,
    shipmentLabelPdf: `/api/orders/documents/${trackingNumber}/label.pdf`,
    transactionRecordPdf: `/api/orders/documents/${trackingNumber}/transaction.pdf`,
  };
}
