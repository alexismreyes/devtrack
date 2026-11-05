import type { TaskAuthorizationPort } from "../../project-members/access/task-authorization-port";
import type { UnitOfWork } from "../../projects/access/unit-of-work";
import {
  ChecklistItemNotFoundError,
  ChecklistNotFoundError,
  TaskNotFoundError,
  TaskParentArchivedError,
} from "../domain/errors";
import type {
  TaskChecklist,
  TaskChecklistItem,
} from "../domain/task-checklist";
import { TaskActivityEvent } from "../domain/task-activity";
import type { ActivityRepository } from "../repository/activity-repository";
import type { ChecklistsRepository } from "../repository/checklists-repository";
import type { TasksRepository } from "../repository/tasks-repository";

export type ChecklistItemView = {
  id: string;
  checklistId: string;
  text: string;
  checked: boolean;
  createdAt: Date;
};

export type ChecklistView = {
  id: string;
  taskId: string;
  name: string;
  createdAt: Date;
  items: ChecklistItemView[];
};

export class ChecklistsService {
  constructor(
    private readonly checklists: ChecklistsRepository,
    private readonly tasks: TasksRepository,
    private readonly authorization: TaskAuthorizationPort,
    private readonly activity: ActivityRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async listByTask(actorId: string, taskId: string): Promise<ChecklistView[]> {
    const task = await this.requireLiveTask(taskId);
    await this.authorization.requireTaskRead(actorId, task.projectId);
    const listed = await this.checklists.listByTaskId(task.id);
    return listed.map((checklist) => this.toChecklistView(checklist));
  }

  async create(
    actorId: string,
    taskId: string,
    name: string,
  ): Promise<ChecklistView> {
    const task = await this.requireLiveTask(taskId);
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      task.projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    return this.unitOfWork.run(async () => {
      const checklist = await this.checklists.create({
        taskId: task.id,
        name,
      });
      await this.activity.create(
        TaskActivityEvent.checklistAdded(
          task.id,
          actorId,
          checklist.id,
          checklist.name,
        ),
      );
      return this.toChecklistView(checklist);
    });
  }

  async updateName(
    actorId: string,
    taskId: string,
    checklistId: string,
    name: string,
  ): Promise<ChecklistView> {
    const task = await this.requireLiveTask(taskId);
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      task.projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    await this.requireChecklistInTask(task.id, checklistId);
    const updated = await this.checklists.updateName(checklistId, name);
    return this.toChecklistView(updated);
  }

  async delete(
    actorId: string,
    taskId: string,
    checklistId: string,
  ): Promise<void> {
    const task = await this.requireLiveTask(taskId);
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      task.projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    await this.requireChecklistInTask(task.id, checklistId);
    await this.unitOfWork.run(async () => {
      const deleted = await this.checklists.delete(checklistId);
      await this.activity.create(
        TaskActivityEvent.checklistRemoved(
          task.id,
          actorId,
          deleted.id,
          deleted.name,
        ),
      );
    });
  }

  async createItem(
    actorId: string,
    taskId: string,
    checklistId: string,
    text: string,
  ): Promise<ChecklistItemView> {
    const task = await this.requireLiveTask(taskId);
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      task.projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    await this.requireChecklistInTask(task.id, checklistId);
    const item = await this.checklists.createItem({ checklistId, text });
    return this.toItemView(item);
  }

  async updateItem(
    actorId: string,
    taskId: string,
    checklistId: string,
    itemId: string,
    input: { text?: string; checked?: boolean },
  ): Promise<ChecklistItemView> {
    const task = await this.requireLiveTask(taskId);
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      task.projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    await this.requireChecklistInTask(task.id, checklistId);
    const existing = await this.requireItemInChecklist(checklistId, itemId);

    const checkedChanging =
      input.checked !== undefined && input.checked !== existing.checked;

    if (!checkedChanging) {
      const updated = await this.checklists.updateItem(itemId, input);
      return this.toItemView(updated);
    }

    return this.unitOfWork.run(async () => {
      const updated = await this.checklists.updateItem(itemId, input);
      if (updated.checked) {
        await this.activity.create(
          TaskActivityEvent.checklistItemCompleted(
            task.id,
            actorId,
            checklistId,
            updated.id,
            updated.text,
          ),
        );
      } else {
        await this.activity.create(
          TaskActivityEvent.checklistItemUncompleted(
            task.id,
            actorId,
            checklistId,
            updated.id,
            updated.text,
          ),
        );
      }
      return this.toItemView(updated);
    });
  }

  async deleteItem(
    actorId: string,
    taskId: string,
    checklistId: string,
    itemId: string,
  ): Promise<void> {
    const task = await this.requireLiveTask(taskId);
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      task.projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    await this.requireChecklistInTask(task.id, checklistId);
    await this.requireItemInChecklist(checklistId, itemId);
    await this.checklists.deleteItem(itemId);
  }

  private async requireLiveTask(taskId: string) {
    const task = await this.tasks.findById(taskId);
    if (task === null || task.deletedAt !== null) {
      throw new TaskNotFoundError();
    }
    return task;
  }

  private async requireChecklistInTask(taskId: string, checklistId: string) {
    const checklist = await this.checklists.findByIdInTask(taskId, checklistId);
    if (checklist === null) {
      throw new ChecklistNotFoundError();
    }
    return checklist;
  }

  private async requireItemInChecklist(checklistId: string, itemId: string) {
    const item = await this.checklists.findItemByIdInChecklist(
      checklistId,
      itemId,
    );
    if (item === null) {
      throw new ChecklistItemNotFoundError();
    }
    return item;
  }

  private assertParentWritable(archivedAt: Date | null): void {
    if (archivedAt !== null) {
      throw new TaskParentArchivedError();
    }
  }

  private toItemView(item: TaskChecklistItem): ChecklistItemView {
    return {
      id: item.id,
      checklistId: item.checklistId,
      text: item.text,
      checked: item.checked,
      createdAt: item.createdAt,
    };
  }

  private toChecklistView(checklist: TaskChecklist): ChecklistView {
    return {
      id: checklist.id,
      taskId: checklist.taskId,
      name: checklist.name,
      createdAt: checklist.createdAt,
      items: checklist.items.map((item) => this.toItemView(item)),
    };
  }
}
