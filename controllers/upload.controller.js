const { db } = require('../config/db');
const path = require('path');
const fs = require('fs');


exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const file = req.file;
    const fileType = req.body.type || 'file';
    const fileUrl = `/uploads/${file.filename}`;

    const [result] = await db.query(
      'INSERT INTO uploads (filename, original_name, type, url, uploaded_by) VALUES (?, ?, ?, ?, ?)',
      [file.filename, file.originalname, fileType, fileUrl, req.user.id]
    );

    res.json({
      id: result.insertId,
      filename: file.originalname,
      type: fileType,
      fileUrl: fileUrl
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
}; 