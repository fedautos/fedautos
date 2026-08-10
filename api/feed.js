import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  try {
    const snapshot = await db.collection('veiculos').get();

    // Cabeçalho do XML (Padrão RSS 2.0 exigido pela Meta e Google)
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n`;
    xml += `  <channel>\n`;
    xml += `    <title>F&amp;D Autos - Catálogo</title>\n`;
    xml += `    <link>https://fedautos.vercel.app</link>\n`;
    xml += `    <description>Catálogo de estoque para o WhatsApp</description>\n`;

    if (snapshot.empty) {
      xml += `  </channel>\n</rss>`;
      res.setHeader('Content-Type', 'text/xml; charset=utf-8');
      return res.status(200).send(xml);
    }

    snapshot.forEach((doc) => {
      const car = doc.data();

      // Mantendo a sua regra de publicação
      if (car.status === 'publicado' && car.emCatalogo !== false) {
        const id = doc.id;

        // Tratamento da marca e título
        let marca = car.marca ? String(car.marca).trim() : '';
        if (marca.toUpperCase() === 'VW') marca = 'Volkswagen';

        const versao = car.versao ? String(car.versao).trim() : '';
        const ano = car.ano ? String(car.ano).split('/').pop() : '';
        const title = `${marca} ${versao} ${ano}`.trim();

        // A descrição não precisa daquele .replace do CSV, pois o CDATA já protege o texto no XML
        const rawDesc = car.descricao || 'Veículo em excelente estado.';

        const url = `https://fedautos.vercel.app/carro/${id}`;
        const image = (car.fotos && car.fotos.length > 0) ? car.fotos[0] : '';

        // Preço com o ' BRL' no final
        const price = car.preco ? String(car.preco).replace(/\D/g, '') + ' BRL' : '0 BRL';

        // Montando cada "linha" (item) do XML
        xml += `    <item>\n`;
        xml += `      <g:id>${id}</g:id>\n`;
        xml += `      <g:title><![CDATA[${title}]]></g:title>\n`;
        xml += `      <g:description><![CDATA[${rawDesc}]]></g:description>\n`;
        xml += `      <g:link>${url}</g:link>\n`;
        xml += `      <g:image_link>${image}</g:image_link>\n`;
        xml += `      <g:brand><![CDATA[${marca}]]></g:brand>\n`;
        xml += `      <g:price>${price}</g:price>\n`;
        xml += `      <g:condition>used</g:condition>\n`;
        xml += `      <g:availability>in stock</g:availability>\n`;
        xml += `    </item>\n`;
      }
    });

    xml += `  </channel>\n`;
    xml += `</rss>`;

    // Avisa o navegador e a Meta que este arquivo é um XML
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.status(200).send(xml);
  } catch (error) {
    console.error('Erro ao gerar catálogo XML:', error);
    res.status(500).send("Erro interno: " + error.message);
  }
}
