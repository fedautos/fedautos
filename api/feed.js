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

    // Estrutura oficial de colunas para o catálogo de automóveis da Meta
    const headers = [
      'vehicle_id',
      'title',
      'description',
      'url',
      'image[0].url',
      'make',
      'model',
      'year',
      'mileage.value',
      'mileage.unit',
      'price',
      'state_of_vehicle',
      'condition',
      'availability',
      'body_style',
      'exterior_color',
      'address.addr1',
      'address.city',
      'address.region',
      'address.country',
      'address.postal_code'
    ].join(',');

    let csv = headers + '\n';

    if (snapshot.empty) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.status(200).send(csv);
    }

    snapshot.forEach((doc) => {
      const car = doc.data();

      if (car.status === 'publicado' && car.emCatalogo !== false) {
        const id = doc.id;

        let marca = car.marca ? String(car.marca).trim() : '';
        if (marca.toUpperCase() === 'VW') marca = 'Volkswagen';

        const versao = car.versao ? String(car.versao).trim() : '';
        const ano = car.ano ? String(car.ano).split('/').pop() : '';
        const title = `${marca} ${versao} ${ano}`.trim();

        const rawDesc = car.descricao || 'Veículo em excelente estado.';
        const description = rawDesc.replace(/[\r\n]+/g, ' ').replace(/"/g, '""');

        const url = `https://fedautos.vercel.app/carro/${id}`;
        const image = (car.fotos && car.fotos.length > 0) ? car.fotos[0] : '';

        const price = car.preco ? String(car.preco).replace(/\D/g, '') + ' BRL' : '0 BRL';
        const km = car.km ? String(car.km).replace(/\D/g, '') : '0';
        const cor = car.cor ? String(car.cor).trim() : 'Outra';

        const csvTitle = `"${title}"`;
        const csvDesc = `"${description}"`;
        const csvMarca = `"${marca}"`;
        const csvVersao = `"${versao}"`;
        const csvCor = `"${cor}"`;

        csv += `${id},${csvTitle},${csvDesc},${url},${image},${csvMarca},${csvVersao},${ano},${km},KM,${price},USED,EXCELLENT,AVAILABLE,OTHER,${csvCor},Rua da Regeneracao 86,Recife,PE,BR,52120-000\n`;
      }
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.status(200).send(csv);
  } catch (error) {
    console.error('Erro ao gerar catálogo:', error);
    res.status(500).send("Erro interno: " + error.message);
  }
}
