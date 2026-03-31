export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Método não permitido');

    const { acao, idFirebase, nome, preco, descricao, imagemUrl, marca } = req.body;
    
    const CATALOG_ID = "643608957084425";
    const META_TOKEN = "EAAVJVRZAZAQo0BRDqvQTaTe3KUNL6ThiusppZBu3Bm97EOaGe0aeAvuKPgwjhFBHH0vSjVhjKit8xABi6ulp5zQ4WXsyEfGMLGhZCioGHHKQxva5K1NU5bTYheJ8zhoZCTnnLoi0H316v1tdSnpWJqh2KKqqBv6rCI12PWv8w5p9ZCWbpUZAs3X4ggfWowpRQZDZD";

    try {
        const precoLimpo = String(preco).replace(/\D/g, '');

        if (acao === 'Criar') {
            const requests = [{
                method: "UPDATE",
                data: {
                    retailer_id: String(idFirebase),
                    name: String(nome || 'Veículo F&D Autos').substring(0, 100),
                    description: String(descricao || 'Consulte para mais detalhes').substring(0, 5000),
                    image_url: imagemUrl,
                    url: 'https://fdautos.com.br', 
                    price: parseInt(precoLimpo),
                    currency: 'BRL',
                    brand: (marca || 'Volkswagen').trim(),
                    condition: 'used',
                    availability: 'in stock'
                }
            }];

            // VOLTAMOS PARA /batch (O caminho correto para o seu catálogo)
            const fbResponse = await fetch(`https://graph.facebook.com/v19.0/${CATALOG_ID}/batch`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${META_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ requests })
            });

            const fbData = await fbResponse.json();
            
            if (fbData.error) {
                console.error("ERRO DA META:", JSON.stringify(fbData.error));
                return res.status(400).json({ success: false, error: fbData.error });
            }

            return res.status(200).json({ success: true, data: fbData });

        } else if (acao === 'Excluir') {
            const requests = [{
                method: "DELETE",
                data: { retailer_id: String(idFirebase) }
            }];
            await fetch(`https://graph.facebook.com/v19.0/${CATALOG_ID}/batch`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${META_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ requests })
            });
            return res.status(200).json({ success: true, message: 'Processado' });
        }
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}
