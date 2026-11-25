import mongoose from 'mongoose';

export async function invalidateOtherStudentSessionsById(studentId, currentSessionId) {
  const collection = mongoose.connection.collection('student_sessions');
  const rows = await collection.find({ session: { $regex: '"student":' } }).project({ _id: 1, session: 1 }).toArray();
  const ids = rows.filter((row) => {
    if (String(row._id) === String(currentSessionId)) return false;
    const data = typeof row.session === 'string' ? JSON.parse(row.session) : row.session;
    return data.student?.id === String(studentId);
  }).map((row) => row._id);
  if (ids.length) await collection.deleteMany({ _id: { $in: ids } });
}

export async function invalidateStudentSessionsById(studentId) {
  const collection = mongoose.connection.collection('student_sessions');
  const rows = await collection.find({ session: { $regex: '"student":' } }).project({ _id: 1, session: 1 }).toArray();
  const ids = rows.filter((row) => {
    const data = typeof row.session === 'string' ? JSON.parse(row.session) : row.session;
    return data.student?.id === String(studentId);
  }).map((row) => row._id);
  if (ids.length) await collection.deleteMany({ _id: { $in: ids } });
}
