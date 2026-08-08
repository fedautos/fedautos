import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Puxa a chave salva na Vercel
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

    // Cabeçalhos atualizados EXATAMENTE com os nomes que o relatório do Facebook pediu
    let csv = 'vehicle_id,title,description,url,image,make,model,year,mileage.value,mileage.unit,price,state_of_vehicle,condition,availability,body_style,address.addr1,address.city,address.region,address.country,address.postal_code\n';

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
        
        // Limpeza de texto para não quebrar o CSV
        const rawDesc = car.descricao || 'Veículo em excelente estado.';
        const description = rawDesc.replace(/(\r\n|\n|\r)/gm, " ").replace(/"/g, '""');
        
        const url = `https://fedautos.vercel.app/carro/${id}`;
        
        // 1. Correção: A coluna agora chama apenas "image"
        const image = (car.fotos && car.fotos.length > 0) ? car.fotos[0] : '';
        
        const price = car.preco ? String(car.preco).replace(/\D/g, '') + ' BRL' : '0 BRL';
        const km = car.km ? String(car.km).replace(/\D/g, '') : '0';

        const csvTitle = `"${title}"`;
        const csvDesc = `"${description}"`;
        const csvMarca = `"${marcaLimpa}"`;
        const csvVersao = `"${versao}"`;

        // Monta a linha com as correções de Maiúsculas, Endereço e Body_Style (OTHER)
        csv += `${id},${csvTitle},${csvDesc},${url},${image},${csvMarca},${csvVersao},${ano},${km},KM,${price},EXCELLENT,used,in stock,OTHER,Rua da Regeneracao 86,Recife,PE,BR,52120-000\n`;
      }
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).send("Erro: " + error.message);
  }
}
