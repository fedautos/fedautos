export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { acao, idFirebase, nome, preco, descricao, imagemUrl, marca } = req.body;

    const CATALOG_ID = process.env.CATALOG_ID || "643608957084425";
    const META_TOKEN = process.env.META_TOKEN || "EAANmnZANCSuoBRJsJFxaixciy2ylU11bPGUPJEjjxypsuAGkQTi4SYntzlyDsrQUn65bmKx4e84RSsDIwNSSPjvW3283tlNGYeqNBEWWST5MH9uadyO4U0Lh7lefANMeI4PcHvzaNTruLIutyvGEQaMbSSbcK23ZAbHnN9EwKRDJ7GWvZAIcfus0T9eLgZDZD";

    try {
        if (acao === 'Criar') {
            // LIMPEZA DE DADOS (O segredo para evitar o Erro 400)
            const precoNumerico = String(preco).replace(/\D/g, ''); // Remove R$, pontos e espaços
            const precoFinal = (parseInt(precoNumerico) || 0).toString() + " BRL";
            
            // A Meta exige uma marca. Se não vier do banco, usamos o nome da loja
            const marcaFinal = marca && marca.trim() !== "" ? marca : "F&D Autos";
            
            // A URL da imagem não pode estar vazia
            if (!imagemUrl || imagemUrl.length < 5) {
                return res.status(400).json({ success: false, error: "URL da imagem inválida ou ausente" });
            }

            const params = new URLSearchParams();
            params.append('retailer_id', String(idFirebase));
            params.append('name', String(nome || 'Veículo').substring(0, 100));
            params.append('description', String(descricao || 'Consulte-nos para mais informações').substring(0, 9000));
            params.append('image_url', imagemUrl);
            params.append('url', 'https://fdautos.com.br'); 
            params.append('price', precoFinal);
            params.append('brand', marcaFinal);
            params.append('condition', 'used');
            params.append('availability', 'in stock');

            const fbResponse = await fetch(`https://graph.facebook.com/v19.0/${CATALOG_ID}/products`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${META_TOKEN}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });

            const fbData = await fbResponse.json();
            
            if (fbData.error) {
                console.error("Erro da Meta:", fbData.error);
                return res.status(400).json({ success: false, error: fbData.error.message });
            }

            return res.status(200).json({ success: true, data: fbData });

        } else if (acao === 'Excluir') {
            // Para excluir, precisamos primeiro achar o ID interno da Meta
            const searchRes = await fetch(`https://graph.facebook.com/v19.0/${CATALOG_ID}/products?filter={"retailer_id":{"eq":"${idFirebase}"}}&access_token=${META_TOKEN}`);
            const searchData = await searchRes.json();

            if (searchData.data && searchData.data.length > 0) {
                const fbId = searchData.data[0].id;
                const delRes = await fetch(`https://graph.facebook.com/v19.0/${fbId}?access_token=${META_TOKEN}`, { 
                    method: 'DELETE' 
                });
                const delData = await delRes.json();
                return res.status(200).json({ success: true, message: 'Removido', data: delData });
            }
            
            return res.status(200).json({ success: true, message: 'Item não encontrado na Meta, nada a excluir.' });
        }

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}
