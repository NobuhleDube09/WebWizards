const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidStudentEmail = (email = '') => EMAIL_REGEX.test(email);

module.exports = { isValidStudentEmail };
