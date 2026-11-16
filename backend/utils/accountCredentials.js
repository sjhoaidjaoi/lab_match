const INITIAL_PASSWORD = '123456'

function isManagedAccount(role) {
  return ['STUDENT', 'LAB_TEACHER', 'LAB_LEADER'].includes(role)
}

module.exports = { INITIAL_PASSWORD, isManagedAccount }
