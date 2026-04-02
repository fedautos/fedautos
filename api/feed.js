import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Puxa a chave que você salvou na Vercel
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  try {
    // Busca os carros na sua coleção, garantindo que só vão os publicados e ativos no catálogo
    const snapshot = await db.collection('veiculos')
      .where('emCatalogo', '==', true)
      .where('status', '==', 'publicado')
      .get();
      
    let itemsXml = '';

    snapshot.forEach(doc => {
      const car = doc.data();
      const fotos = car.fotos || [];
      
      // Ajustes de formato para o Facebook não rejeitar
      const precoLimpo = car.preco ? String(car.preco).replace(/\D/g, '') : '0';
      const kmLimpo = car.km ? String(car.km).replace(/\D/g, '') : '0';
      // Pega o último ano se o formato for "2023/2024"
      const anoLimpo = car.ano ? String(car.ano).split('/').pop() : ''; 

      // 1. Foto Principal (Capa)
      const fotoPrincipal = fotos.length > 0 ? fotos[0] : '';

      // 2. Fotos Adicionais (Para o Carrossel) em ordem
      let fotosAdicionaisXml = '';
      if (fotos.length > 1) {
        fotosAdicionaisXml = fotos.slice(1).map(url => `
          <g:additional_image_link><![CDATA[${url}]]></g:additional_image_link>
        `).join('');
      }

      itemsXml += `
        <item>
          <g:id>${doc.id}</g:id>
          <g:title><![CDATA[${car.marca} ${car.versao} ${anoLimpo}]]></g:title>
          <g:description><![CDATA[${car.descricao || 'Veículo em excelente estado.'}]]></g:description>
          <g:link>https://fedautos.vercel.app/carro/${doc.id}</g:link>
          
          <g:image_link><![CDATA[${fotoPrincipal}]]></g:image_link>
          ${fotosAdicionaisXml}
          
          <g:brand><![CDATA[${car.marca}]]></g:brand>
          <g:make><![CDATA[${car.marca}]]></g:make>
          <g:model><![CDATA[${car.versao}]]></g:model>
          <g:year>${anoLimpo}</g:year>
          <g:price>${precoLimpo}.00 BRL</g:price>
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

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(xml);
  } catch (error) {
    res.status(500).send("Erro: " + error.message);
  }
}
