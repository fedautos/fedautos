import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

// Funções auxiliares de sanitização
const cleanDigits = (val) => (val ? String(val).replace(/\D/g, '') : '0');
const sanitizeText = (str) => (str ? String(str).replace(/[\r\n]+/g, ' ').trim() : '');

export default async function handler(req, res) {
  try {
    const snapshot = await db.collection('veiculos').get();

    if (snapshot.empty) {
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?><rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel><title>F&amp;D Autos Catalog</title><link>https://fedautos.vercel.app</link></channel></rss>`;
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      return res.status(200).send(emptyXml);
    }

    let itemsXml = '';

    snapshot.forEach((doc) => {
      const car = doc.data();

      if (car.status === 'publicado' && car.emCatalogo !== false) {
        const id = doc.id;
        const fotos = car.fotos || [];

        let marca = sanitizeText(car.marca);
        if (marca.toUpperCase() === 'VW') marca = 'Volkswagen';

        const versao = sanitizeText(car.versao);
        const ano = car.ano ? String(car.ano).split('/').pop() : '';
        const titulo = `${marca} ${versao} ${ano}`.trim();
        const descricao = sanitizeText(car.descricao) || 'Veículo em excelente estado.';

        const preco = cleanDigits(car.preco);
        const km = cleanDigits(car.km);

        const fotoPrincipal = fotos.length > 0 ? fotos[0] : '';
        const fotosAdicionaisXml = fotos.length > 1
          ? fotos.slice(1).map((url) => `<g:additional_image_link><![CDATA[${url}]]></g:additional_image_link>`).join('')
          : '';

        itemsXml += `
          <item>
            <g:id>${id}</g:id>
            <g:title><![CDATA[${titulo}]]></g:title>
            <g:description><![CDATA[${descricao}]]></g:description>
            <g:link>https://fedautos.vercel.app/carro/${id}</g:link>
            <g:image_link><![CDATA[${fotoPrincipal}]]></g:image_link>
            ${fotosAdicionaisXml}
            <g:brand><![CDATA[${marca}]]></g:brand>
            <g:make><![CDATA[${marca}]]></g:make>
            <g:model><![CDATA[${versao}]]></g:model>
            <g:year>${ano}</g:year>
            <g:price>${preco}.00 BRL</g:price>
            <g:condition>used</g:condition>
            <g:state_of_vehicle>EXCELLENT</g:state_of_vehicle>
            <g:availability>in stock</g:availability>
            <g:body_style>OTHER</g:body_style>
            <g:mileage>
              <g:value>${km}</g:value>
              <g:unit>KM</g:unit>
            </g:mileage>
            <g:address>
              <g:street_address>Rua da Regeneracao 86</g:street_address>
              <g:city>Recife</g:city>
              <g:region>PE</g:region>
              <g:postal_code>52120-000</g:postal_code>
              <g:country>BR</g:country>
            </g:address>
          </item>`;
      }
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>F&amp;D Autos Catalog</title>
    <link>https://fedautos.vercel.app</link>
    ${itemsXml}
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(xml);
  } catch (error) {
    res.status(500).send("Erro: " + error.message);
  }
}
