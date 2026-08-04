import Meeting from '../models/Meeting.js';
import Lead from '../models/Lead.js';
import { notifyTeam, createNotification } from '../services/notificationService.js';

export async function listMeetings(req, res) {
  const { from, to } = req.query;
  const filter = { team: req.user.team };

  if (from || to) {
    filter.startAt = {};
    if (from) filter.startAt.$gte = new Date(from);
    if (to) filter.startAt.$lte = new Date(to);
  }

  const meetings = await Meeting.find(filter)
    .populate('organizer', 'name email avatar')
    .populate('attendees', 'name email')
    .populate('lead', 'name company')
    .sort({ startAt: 1 });

  res.json({ meetings });
}

export async function createMeeting(req, res) {
  const { title, description, location, startAt, endAt, leadId, attendees, meetingType } = req.body;

  if (!title || !startAt || !endAt) {
    return res.status(400).json({ message: 'Title, start, and end are required' });
  }

  const meeting = await Meeting.create({
    team: req.user.team,
    organizer: req.user._id,
    title,
    description,
    location,
    startAt,
    endAt,
    lead: leadId || undefined,
    attendees: attendees || [],
    meetingType,
  });

  if (leadId) {
    await Lead.findByIdAndUpdate(leadId, {
      $push: {
        activities: {
          type: 'meeting',
          content: `Meeting scheduled: ${title}`,
          createdBy: req.user._id,
        },
      },
      nextFollowUpAt: startAt,
    });
  }

  await notifyTeam({
    teamId: req.user.team,
    excludeUserId: req.user._id,
    type: 'meeting',
    title: 'Meeting scheduled',
    message: `${req.user.name} scheduled "${title}"`,
    link: '/meetings',
  });

  const populated = await Meeting.findById(meeting._id)
    .populate('organizer', 'name email avatar')
    .populate('attendees', 'name email')
    .populate('lead', 'name company');

  res.status(201).json({ meeting: populated });
}

export async function updateMeeting(req, res) {
  const meeting = await Meeting.findOne({ _id: req.params.id, team: req.user.team });
  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

  const fields = ['title', 'description', 'location', 'startAt', 'endAt', 'status', 'meetingType', 'attendees'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) meeting[f] = req.body[f];
  });
  if (req.body.leadId !== undefined) meeting.lead = req.body.leadId || undefined;

  await meeting.save();

  const populated = await Meeting.findById(meeting._id)
    .populate('organizer', 'name email avatar')
    .populate('attendees', 'name email')
    .populate('lead', 'name company');

  res.json({ meeting: populated });
}

export async function deleteMeeting(req, res) {
  const meeting = await Meeting.findOne({ _id: req.params.id, team: req.user.team });
  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
  await meeting.deleteOne();
  res.json({ message: 'Meeting deleted' });
}

export async function remindMeeting(req, res) {
  const meeting = await Meeting.findOne({ _id: req.params.id, team: req.user.team })
    .populate('attendees', '_id');
  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

  const targets = new Set([String(meeting.organizer), ...meeting.attendees.map((a) => String(a._id))]);
  await Promise.all(
    [...targets].map((userId) =>
      createNotification({
        team: req.user.team,
        user: userId,
        type: 'meeting',
        title: 'Meeting reminder',
        message: `Reminder: "${meeting.title}" starts soon`,
        link: '/meetings',
      })
    )
  );

  res.json({ message: 'Reminders sent' });
}
