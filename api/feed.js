import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export async function GET() {
  try {
    const querySnapshot = await getDocs(collection(db, "veiculos"));
    const cars = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Cabeçalho padronizado do Meta Automotive Inventory Ads
    const headers = [
      "vehicle_id",
      "title",
      "description",
      "url",
      "image[0].url",
      "make",
      "model",
      "year",
      "mileage.value",
      "mileage.unit",
      "price",
      "state_of_vehicle",
      "condition",
      "availability",
      "body_style",
      "exterior_color",
      "address"
    ];

    const rows = cars.map(car => {
      // 1. Imagem principal
      const imageUrl = car.foto_capa || car.imagem || (Array.isArray(car.fotos) ? car.fotos[0] : '') || '';
      
      // 2. Preço formatado com a moeda (ex: 65000.00 BRL)
      const rawPrice = parseFloat(car.preco || car.price || 0);
      const formattedPrice = `${rawPrice.toFixed(2)} BRL`;

      // 3. Quilometragem
      const kmValue = parseInt(car.km || car.mileage || 0, 10);

      // 4. Estado do veículo (USED para usado, NEW para 0km)
      const state = (kmValue === 0 || car.estado === 'zero' || car.zero) ? 'NEW' : 'USED';

      // 5. Título e Descrição protegidos contra aspas
      const rawTitle = `${car.marca || ''} ${car.modelo || ''} ${car.versao || ''} ${car.ano || ''}`.trim() || 'Veículo';
      const cleanTitle = `"${rawTitle.replace(/"/g, '""')}"`;
      const cleanDesc = `"${(car.descricao || rawTitle).replace(/"/g, '""')}"`;

      // 6. URL do veículo no seu site
      const carUrl = `https://fd-autos-site.vercel.app/carro/${car.id}`;

      return [
        car.id,                                         // vehicle_id
        cleanTitle,                                     // title
        cleanDesc,                                      // description
        carUrl,                                         // url
        imageUrl,                                       // image[0].url
        car.marca || 'Outra',                           // make
        car.modelo || 'Não informado',                 // model
        car.ano || 2020,                                // year
        kmValue,                                        // mileage.value
        'KM',                                           // mileage.unit
        formattedPrice,                                 // price
        state,                                          // state_of_vehicle
        'EXCELLENT',                                    // condition
        'AVAILABLE',                                    // availability
        car.carroceria || 'OTHER',                      // body_style
        car.cor || 'Outra',                             // exterior_color
        '"Rua da Regeneração 86, Recife, PE, Brasil"'   // address
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'inline; filename="catalog.csv"',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    return new Response(`Erro ao gerar catálogo: ${error.message}`, { status: 500 });
  }
}
