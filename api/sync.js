export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Método não permitido');

    const { acao, idFirebase, nome, preco, descricao, imagemUrl, marca } = req.body;
    
    // VERIFIQUE SE ESTES DOIS DADOS ESTÃO EXATAMENTE IGUAIS AOS DO SEU PAINEL DA META
    const CATALOG_ID = process.env.CATALOG_ID || "643608957084425";
    const META_TOKEN = process.env.META_TOKEN || "EAANmnZANCSuoBRJsJFxaixciy2ylU11bPGUPJEjjxypsuAGkQTi4SYntzlyDsrQUn65bmKx4e84RSsDIwNSSPjvW3283tlNGYeqNBEWWST5MH9uadyO4U0Lh7lefANMeI4PcHvzaNTruLIutyvGEQaMbSSbcK23ZAbHnN9EwKRDJ7GWvZAIcfus0T9eLgZDZD";

    try {
        if (acao === 'Criar') {
            const precoLimpo = String(preco).replace(/\D/g, '');

            // Montando o comando no formato BATCH (mais robusto)
            const requests = [{
                method: "UPDATE",
                data: {
                    retailer_id: String(idFirebase),
                    name: String(nome || 'Veículo').substring(0, 100),
                    description: String(descricao || 'Consulte-nos').substring(0, 5000),
                    image_url: imagemUrl,
                    url: 'https://fdautos.com.br',
                    price: parseInt(precoLimpo),
                    currency: 'BRL',
                    brand: (marca || 'Volkswagen').trim(),
                    condition: 'used',
                    availability: 'in stock'
                }
            }];

            const fbResponse = await fetch(`https://graph.facebook.com/v19.0/${CATALOG_ID}/batch`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${META_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ requests })
            });

            const fbData = await fbResponse.json();
            
            if (fbData.error || (fbData.handles && fbData.handles.length === 0)) {
                console.error("ERRO CRÍTICO DA META:", JSON.stringify(fbData));
                return res.status(400).json({ success: false, error: fbData.error || "Erro no processamento batch" });
            }

            return res.status(200).json({ success: true, data: fbData });

        } else if (acao === 'Excluir') {
            // Lógica de exclusão via Batch
            const requests = [{
                method: "DELETE",
                data: { retailer_id: String(idFirebase) }
            }];
            await fetch(`https://graph.facebook.com/v19.0/${CATALOG_ID}/batch`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${META_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ requests })
            });
            return res.status(200).json({ success: true, message: 'Comando de exclusão enviado' });
        }
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}
