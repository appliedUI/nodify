export class UserModel {
  constructor({ id, name, email, role, createdAt = Date.now(), subjects = [], history = [] }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role;
    this.createdAt = createdAt;
    this.subjects = subjects; // New field to store associated subjects
    this.history = history; // Array of user activity history items
  }

  static get schema() {
    return "++id, name, email, role, createdAt, *history";
  }

  static validate(userData) {
    const errors = [];

    if (!userData.name?.trim()) {
      errors.push("Name is required");
    }

    if (!userData.email?.trim()) {
      errors.push("Email is required");
    } else if (!userData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.push("Invalid email format");
    }

    if (!userData.role?.trim()) {
      errors.push("Role is required");
    }

    return errors;
  }
}
