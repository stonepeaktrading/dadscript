// api/pay.js
// Vercel serverless function — safely calls Lenco v2 Collections API
// Secret key never touches the browser

const LENCO_SECRET_KEY = process.env.LENCO_SECRET_KEY;
const LENCO_API = 'https://api.lenco.co/access/v2/collections/card';

const PLANS = {
  monthly: { amount: '25.00', currency: 'USD', description: 'Dadscript Monthly — $25/mo' },
  annual:  { amount: '270.00', currency: 'USD', description: 'Dadscript Annual — $270/yr' }
};

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS — allow your Vercel domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { plan, cardNumber, expiryMonth, expiryYear, cvv, cardHolderName, email } = req.body;

  // Validate plan
  if (!PLANS[plan]) {
    return res.status(400).json({ error: 'Invalid plan selected.' });
  }

  // Validate required fields
  if (!cardNumber || !expiryMonth || !expiryYear || !cvv || !cardHolderName || !email) {
    return res.status(400).json({ error: 'All card fields are required.' });
  }

  const selectedPlan = PLANS[plan];
  const reference = `DS-${plan.toUpperCase()}-${Date.now()}`;

  try {
    const lencoResponse = await fetch(LENCO_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LENCO_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: selectedPlan.amount,
        currency: selectedPlan.currency,
        reference: reference,
        description: selectedPlan.description,
        bearer: 'merchant',
        cardDetails: {
          number: cardNumber.replace(/\s/g, ''),
          expiryMonth: expiryMonth,
          expiryYear: expiryYear,
          cvv: cvv,
          name: cardHolderName
        },
        customerDetails: {
          email: email
        }
      })
    });

    const data = await lencoResponse.json();

    if (!lencoResponse.ok || !data.status) {
      return res.status(400).json({
        error: data.message || 'Payment failed. Please check your card details and try again.'
      });
    }

    const collection = data.data;

    // Return status to frontend
    return res.status(200).json({
      status: collection.status,           // 'successful' | 'pending' | 'failed'
      reference: collection.reference,
      lencoReference: collection.lencoReference,
      // If 3DS/redirect is needed, Lenco may return a redirect URL
      redirectUrl: collection.redirectUrl || null
    });

  } catch (err) {
    console.error('Lenco API error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
