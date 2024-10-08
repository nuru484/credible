const express = require('express');
const router = express.Router();
const passport = require('passport');
const pool = require('../db/pool');

// Route for rendering the index page
router.get('/', (req, res) => {
  res.render('index');
});

// Route for rendering login page get
router.get('/userLogin', (req, res) => {
  const errors = req.session.errors || [];
  req.session.errors = [];

  res.render('userLogin', { user: req.user, errors });
});

// Route for user login post
router.post('/userLogin', (req, res, next) => {
  passport.authenticate('custom', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      const errors = [];
      if (info.message.includes('Incorrect')) {
        errors.push({
          field: 'username',
          message: 'Incorrect username or index number',
          sound: true,
        });
      }
      if (info.message.includes('voted already')) {
        errors.push({
          field: 'voted',
          message: 'Student has already voted',
          sound: true,
        });
      }
      if (info.message.includes('not approved')) {
        errors.push({
          field: 'status',
          message: 'Student account not approved by admin',
          sound: true,
        });
      }

      return res.render('userLogin', { errors });
    }

    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.redirect('/votes');
    });
  })(req, res, next);
});

// Route for rendering the votes page
router.get('/votes', async (req, res) => {
  if (req.isAuthenticated() && req.user.status === true) {
    const student = req.user;

    try {
      // Fetch candidates from the database
      const candidatesResult = await pool.query(
        'SELECT * FROM candidates ORDER BY id ASC'
      );
      const candidates = candidatesResult.rows;

      // Order of positions
      const positionOrder = [
        'PRESIDENT',
        'AMBASSADOR',
        'GENERAL SECRETARY',
        'WOCOM',
        'FINANCIAL OFFICER',
        'PRO',
        'ENTERTAINMENT SECRETARY',
        'SPORTS SECRETARY',
      ];

      // Group candidates by position
      const groupedCandidates = candidates.reduce((acc, candidate) => {
        if (!acc[candidate.position]) {
          acc[candidate.position] = [];
        }
        acc[candidate.position].push(candidate);
        return acc;
      }, {});

      // Candidates by position order
      const sortedGroupedCandidates = positionOrder.reduce((acc, position) => {
        if (groupedCandidates[position]) {
          acc[position] = groupedCandidates[position];
        }
        return acc;
      }, {});

      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');

      // Pass sorted grouped candidates to the view
      res.render('votes', {
        student,
        groupedCandidates: sortedGroupedCandidates,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch candidates.' });
    }
  } else {
    res.redirect('/userLogin');
  }
});

// Route for logging out
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.redirect('/');
    }
    res.redirect('/userLogin');
  });
});

module.exports = router;
