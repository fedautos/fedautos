import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Lê a chave que você colou na Vercel
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  try {
    // Busca os veículos no seu Firestore
    const snapshot = await db.collection('veiculos').get();
    let itemsXml = '';

    snapshot.forEach(doc => {
      const car = doc.data();
      
      // Limpeza simples de dados para o padrão XML
      const precoLimpo = car.preco ? String(car.preco).replace(/\D/g, '') : '0';
      const kmLimpo = car.km ? String(car.km).replace(/\D/g, '') : '0';
      const anoLimpo = car.ano ? String(car.ano).substring(0, 4) : '';

      itemsXml += `
        <item>
          <g:id>${doc.id}</g:id>
          <g:title><![CDATA[${car.marca} ${car.versao} ${anoLimpo}]]></g:title>
          <g:description><![CDATA[${car.descricao || 'Veículo em excelente estado.'}]]></g:description>
          <g:link>https://fedautos.vercel.app/carro/${doc.id}</g:link>
          <g:image_link>${(car.fotos && car.fotos.length > 0) ? car.fotos[0] : ''}</g:image_link>
          <g:make>${car.marca}</g:make>
          <g:model>${car.versao}</g:model>
          <g:year>${anoLimpo}</g:year>
          <g:price>${precoLimpo} BRL</g:price>
          <g:condition>used</g:condition>
          <g:availability>in stock</g:availability>
          <g:mileage>
            <g:value>${kmLimpo}</g:value>
            <g:unit>km</g:unit>
          </g:mileage>
          <g:address>
            <g:street_address>Rua da Regeneracao 86</g:street_address>
            <g:city>Recife</g:city>
            <g:region>PE</g:region>
            <g:postal_code>52120-000</g:postal_code>
            <g:country>BR</g:country>
          </g:address>
        </item>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
        <channel>
          <title>F&amp;D Autos Catalog</title>
          <link>https://fedautos.vercel.app</link>
          ${itemsXml}
        </channel>
      </rss>`;

    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error) {
    res.status(500).send("Erro ao gerar feed: " + error.message);
  }
}
