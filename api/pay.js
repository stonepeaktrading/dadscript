export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const LENCO_SECRET_KEY = process.env.LENCO_SECRET_KEY;

  const PLANS = {
    monthly: { amount: '25.00', currency: 'USD', description: 'Dadscript Monthly' },
    annual:  { amount: '270.00', currency: 'USD', description: 'Dadscript Annual'  }
  };

  const { plan, email, cardHolderName, cardNumber, expiryMonth, expiryYear, cvv } = req.body;

  if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan.' });
  if (!email || !cardHolderName || !cardNumber || !expiryMonth || !expiryYear || !cvv)
    return res.status(400).json({ error: 'All fields are required.' });

  try {
    const response = await fetch('https://api.lenco.co/access/v2/collections/card', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LENCO_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: PLANS[plan].amount,
        currency: PLANS[plan].currency,
        reference: `DS-${plan}-${Date.now()}`,
        description: PLANS[plan].description,
        bearer: 'merchant',
        cardDetails: {
          number: cardNumber.replace(/\s/g, ''),
          expiryMonth,
          expiryYear,
          cvv,
          name: cardHolderName
        },
        customerDetails: { email }
      })
    });

    const data = await response.json();

    if (!response.ok || !data.status)
      return res.status(400).json({ error: data.message || 'Payment failed. Please try again.' });

    return res.status(200).json({
      status: data.data.status,
      redirectUrl: data.data.redirectUrl || null
    });

  } catch (err) {
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
