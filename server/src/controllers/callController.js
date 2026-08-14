import Call from '../models/Call.js';
import Client from '../models/Client.js';
import Organization from '../models/Organization.js';
import Notification from '../models/Notification.js';
import { analyzeCall, generateClarifyingQuestions } from '../services/aiService.js';

function statusLabel(status) {
  const map = {
    uploaded: 'Uploaded',
    processing: 'AI Processing',
    analyzed: 'Analyzed',
    proposal_ready: 'Proposal Ready',
    awaiting_approval: 'Awaiting Approval',
    sent: 'Proposal Sent',
    won: 'Won',
    lost: 'Lost',
  };
  return map[status] || status;
}

export async function listCalls(req, res) {
  const calls = await Call.find({ organization: req.user.organization })
    .populate('client', 'companyName contactName contactEmail contactTitle')
    .populate('owner', 'name email')
    .sort({ updatedAt: -1 });
  return res.json({
    calls: calls.map((c) => ({
      ...c.toObject(),
      statusLabel: statusLabel(c.status),
    })),
  });
}

export async function getCall(req, res) {
  const call = await Call.findOne({ _id: req.params.id, organization: req.user.organization })
    .populate('client')
    .populate('owner', 'name email')
    .populate('proposal');
  if (!call) return res.status(404).json({ message: 'Call not found' });
  return res.json({ call: { ...call.toObject(), statusLabel: statusLabel(call.status) } });
}

export async function createCall(req, res) {
  try {
    const {
      clientId,
      companyName,
      contactName,
      contactEmail,
      contactTitle,
      title,
      transcript,
      source = 'paste',
      sourceLabel,
      fileName,
      analyze = true,
    } = req.body;

    let client;
    if (clientId) {
      client = await Client.findOne({ _id: clientId, organization: req.user.organization });
    } else if (companyName) {
      client = await Client.create({
        organization: req.user.organization,
        companyName,
        contactName,
        contactEmail,
        contactTitle,
        owner: req.user._id,
        status: 'qualified',
      });
    }

    if (!client) {
      return res.status(400).json({ message: 'Client or companyName is required' });
    }

    const call = await Call.create({
      organization: req.user.organization,
      client: client._id,
      owner: req.user._id,
      title: title || `${client.companyName} discovery call`,
      transcript: transcript || '',
      source,
      sourceLabel: sourceLabel || source,
      fileName,
      status: analyze ? 'processing' : 'uploaded',
    });

    await Organization.findByIdAndUpdate(req.user.organization, {
      $inc: { 'usage.callsThisMonth': 1 },
    });

    if (analyze && call.transcript) {
      // Simulate async AI processing latency for SaaS feel
      setTimeout(async () => {
        try {
          const fresh = await Call.findById(call._id).populate('client');
          if (!fresh) return;
          const analysis = await analyzeCall(fresh, fresh.client);
          fresh.analysis = analysis;
          fresh.status = 'analyzed';
          await fresh.save();
          await Notification.create({
            organization: fresh.organization,
            user: fresh.owner,
            type: 'call_analyzed',
            title: 'Call analysis ready',
            body: `${fresh.client.companyName} requirements extracted with confidence scores.`,
            link: `/calls/${fresh._id}`,
          });
        } catch (err) {
          console.error('Analyze background failed', err);
        }
      }, 1200);
    }

    const populated = await Call.findById(call._id).populate('client');
    return res.status(201).json({
      call: { ...populated.toObject(), statusLabel: statusLabel(populated.status) },
      message: analyze ? 'Upload received. AI analysis started.' : 'Call saved.',
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

export async function analyzeExistingCall(req, res) {
  try {
    const call = await Call.findOne({ _id: req.params.id, organization: req.user.organization }).populate('client');
    if (!call) return res.status(404).json({ message: 'Call not found' });
    if (!call.transcript?.trim()) {
      return res.status(400).json({ message: 'Transcript is required for analysis' });
    }

    call.status = 'processing';
    await call.save();

    const analysis = await analyzeCall(call, call.client);
    call.analysis = analysis;
    call.status = 'analyzed';
    await call.save();

    await Notification.create({
      organization: call.organization,
      user: req.user._id,
      type: 'call_analyzed',
      title: 'Call analysis ready',
      body: `${call.client.companyName} analysis complete.`,
      link: `/calls/${call._id}`,
    });

    return res.json({ call: { ...call.toObject(), statusLabel: statusLabel(call.status) } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function updateMissingAnswers(req, res) {
  const call = await Call.findOne({ _id: req.params.id, organization: req.user.organization });
  if (!call) return res.status(404).json({ message: 'Call not found' });
  const { answers = [] } = req.body;
  if (!call.analysis) return res.status(400).json({ message: 'Call has not been analyzed' });

  call.analysis.missingInformation = (call.analysis.missingInformation || []).map((item) => {
    const match = answers.find((a) => a.field === item.field);
    if (!match) return item;
    return { ...item.toObject?.() ?? item, answered: true, answer: match.answer };
  });
  call.markModified('analysis');
  await call.save();
  return res.json({ call });
}

export async function clarifyingQuestions(req, res) {
  const call = await Call.findOne({ _id: req.params.id, organization: req.user.organization });
  if (!call) return res.status(404).json({ message: 'Call not found' });
  const questions = generateClarifyingQuestions(call.analysis?.missingInformation || []);
  return res.json({ questions });
}
