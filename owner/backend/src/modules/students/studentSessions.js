import mongoose from 'mongoose';

async function removeStudentSessions(matches) {
  const collection = mongoose.connection.collection('student_sessions');
  const sessions = await collection.find({ session: { $regex: '"student":' } }).project({ _id: 1, session: 1 }).toArray();
  const ids = sessions.filter((row) => {
    const data = typeof row.session === 'string' ? JSON.parse(row.session) : row.session;
    return data.student && matches(data.student);
  }).map((row) => row._id);
  if (ids.length) await collection.deleteMany({ _id: { $in: ids } });
  return ids.length;
}

export function invalidateStudentSessionsById(studentId) {
  return removeStudentSessions((student) => student.id === String(studentId));
}

export function invalidateStudentSessionsByOrganizations(organizationIds) {
  const ids = new Set(organizationIds.map(String));
  return removeStudentSessions((student) => ids.has(String(student.organizationId)));
}
