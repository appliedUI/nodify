export class UserWorkspaceModel {
  constructor({ id, userId, workspaceId, role = 'member', joinedAt = new Date(), subjectId = null }) {
    if (id) this.id = id;
    this.userId = userId;
    this.workspaceId = workspaceId;
    this.role = role;
    this.joinedAt = joinedAt;
    this.subjectId = subjectId; // New field to associate with a subject
  }

  static get schema() {
    return "++id, userId, workspaceId, role, joinedAt, subjectId, [userId+workspaceId+subjectId]";
  }

  static validate(userWorkspaceData) {
    // Implement validation logic if necessary
  }
}
