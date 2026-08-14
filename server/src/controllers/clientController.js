import Client from '../models/Client.js';

export async function listClients(req, res) {
  const clients = await Client.find({ organization: req.user.organization }).sort({ updatedAt: -1 });
  return res.json({ clients });
}

export async function createClient(req, res) {
  try {
    const client = await Client.create({
      ...req.body,
      organization: req.user.organization,
      owner: req.user._id,
    });
    return res.status(201).json({ client });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

export async function updateClient(req, res) {
  const client = await Client.findOneAndUpdate(
    { _id: req.params.id, organization: req.user.organization },
    req.body,
    { new: true }
  );
  if (!client) return res.status(404).json({ message: 'Client not found' });
  return res.json({ client });
}
