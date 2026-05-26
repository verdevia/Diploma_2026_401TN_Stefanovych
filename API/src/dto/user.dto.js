class UserDTO {
  constructor({ user_id, username, email, role, created_at }) {
    this.id = user_id;
    this.username = username;
    this.email = email;
    this.role = role;
    this.created_at = created_at;
  }
}

module.exports = UserDTO;