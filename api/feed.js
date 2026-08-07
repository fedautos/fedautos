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

    // 1. Cabeçalhos obrigatórios da Meta para Veículos
    let csv = 'vehicle_id,title,description,url,image_url,make,model,year,mileage.value,mileage.unit,price,state_of_vehicle,condition,availability\n';

    if (snapshot.empty) {
       res.setHeader('Content-Type', 'text/csv; charset=utf-8');
       return res.status(200).send(csv);
    }

    snapshot.forEach(doc => {
      const car = doc.data();
      if (car.status === 'publicado' && car.emCatalogo !== false) {
        const id = doc.id;
        
        let marcaLimpa = car.marca || '';
        if (marcaLimpa.toUpperCase() === 'VW') marcaLimpa = 'Volkswagen';
        
        const versao = car.versao || '';
        const ano = car.ano ? String(car.ano).split('/').pop() : '';
        const title = `${marcaLimpa} ${versao} ${ano}`.trim();
        
        // Remove quebras de linha para não quebrar a estrutura do CSV
        const rawDesc = car.descricao || 'Veículo em excelente estado.';
        const description = rawDesc.replace(/(\r\n|\n|\r)/gm, " ").replace(/"/g, '""');
        
        const url = `https://fedautos.vercel.app/carro/${id}`;
        const image_url = (car.fotos && car.fotos.length > 0) ? car.fotos[0] : '';
        const price = car.preco ? String(car.preco).replace(/\D/g, '') + ' BRL' : '0 BRL';
        const km = car.km ? String(car.km).replace(/\D/g, '') : '0';

        // Garante que campos de texto fiquem entre aspas duplas (Regra do CSV)
        const csvTitle = `"${title}"`;
        const csvDesc = `"${description}"`;
        const csvMarca = `"${marcaLimpa}"`;
        const csvVersao = `"${versao}"`;

        // Monta a linha do carro separada por vírgulas
        csv += `${id},${csvTitle},${csvDesc},${url},${image_url},${csvMarca},${csvVersao},${ano},${km},km,${price},Excellent,used,in stock\n`;
      }
    });

    // 2. Avisa ao Facebook que é um arquivo CSV autêntico
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).send("Erro: " + error.message);
  }
}
