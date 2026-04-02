import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Configuração do Firebase Admin usando variável de ambiente da Vercel
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  try {
    // Busca apenas os veículos que estão ativos no catálogo e publicados
    const snapshot = await db.collection('veiculos')
      .where('emCatalogo', '==', true)
      .where('status', '==', 'publicado') // Garante que rascunhos não vão pro Facebook
      .get();
      
    let itemsXml = '';

    snapshot.forEach(doc => {
      const car = doc.data();
      
      // 1. Tratamento do Ano: Pega apenas o último ano se vier "2023/2024"
      let anoFormatado = car.ano ? String(car.ano).split('/').pop() : '';

      // 2. Tratamento de Números: Remove os pontos gerados pelo seu front-end ("54.990" -> "54990")
      let precoNumerico = car.preco ? String(car.preco).replace(/\./g, '') : '0';
      let kmNumerico = car.km ? String(car.km).replace(/\./g, '') : '0';

      // 3. Tratamento de Imagem: Pega a primeira foto do seu array 'fotos'
      let imagemPrincipal = (car.fotos && car.fotos.length > 0) 
        ? car.fotos[0] 
        : 'https://via.placeholder.com/800x600?text=Sem+Foto';

      // Montando cada item do XML (usando CDATA para proteger emojis e textos especiais gerados pela IA)
      itemsXml += `
        <item>
          <g:id>${doc.id}</g:id>
          <g:title><![CDATA[${car.marca} ${car.versao} ${anoFormatado}]]></g:title>
          <g:description><![CDATA[${car.descricao || 'Veículo em excelente estado de conservação.'}]]></g:description>
          <g:link>https://fedautos.vercel.app/carro/${doc.id}</g:link>
          <g:image_link><![CDATA[${imagemPrincipal}]]></g:image_link>
          <g:brand><![CDATA[${car.marca}]]></g:brand>
          <g:make><![CDATA[${car.marca}]]></g:make>
          <g:model><![CDATA[${car.versao}]]></g:model>
          <g:year>${anoFormatado}</g:year>
          <g:price>${precoNumerico}.00 BRL</g:price>
          <g:condition>used</g:condition>
          <g:availability>in stock</g:availability>
          <g:mileage>
            <g:value>${kmNumerico}</g:value>
            <g:unit>km</g:unit>
          </g:mileage>
          <g:address>
            <g:street_address>Rua da Regeneracao 86</g:street_address>
            <g:city>Recife</g:city>
            <g:region>PE</g:region>
            <g:country>BR</g:country>
          </g:address>
        </item>`;
    });

    // Envelopando tudo no formato RSS 2.0 que o Google e Facebook exigem
    const fullXml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
        <channel>
          <title>Catálogo F&amp;D Autos</title>
          <link>https://fedautos.vercel.app</link>
          <description>Feed dinâmico de veículos em estoque</description>
          ${itemsXml}
        </channel>
      </rss>`;

    // Avisa o navegador/Facebook que a resposta é um XML válido
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(fullXml);

  } catch (error) {
    console.error("Erro ao gerar feed XML:", error);
    res.status(500).json({ error: "Erro ao gerar feed XML", detalhes: error.message });
  }
}
