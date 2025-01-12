export class WorkspaceModel {
  constructor({ id, name, description = '', status = 'pending', createdAt = new Date() }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.status = status;
    this.createdAt = createdAt;
  }

  static get schema() {
    return "++id, name, description, status, createdAt";
  }

  static validate(workspaceData) {
    const errors = [];

    if (!workspaceData.name?.trim()) {
      errors.push("Workspace name is required");
    }

    return errors;
  }
}
