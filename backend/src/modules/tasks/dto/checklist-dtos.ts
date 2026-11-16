import type {
  ChecklistItemView,
  ChecklistView,
} from "../service/checklists-service";

export type PublicChecklistItemDto = {
  id: string;
  checklistId: string;
  text: string;
  checked: boolean;
  createdAt: string;
};

export type PublicChecklistDto = {
  id: string;
  taskId: string;
  name: string;
  createdAt: string;
  items: PublicChecklistItemDto[];
  itemCount: number;
  checkedCount: number;
};

export type ChecklistListResponseDto = {
  checklists: PublicChecklistDto[];
};

export type ChecklistItemListResponseDto = {
  items: PublicChecklistItemDto[];
  nextCursor: string | null;
};

export type CreateChecklistRequestDto = {
  name: string;
};

export type UpdateChecklistRequestDto = {
  name: string;
};

export type CreateChecklistItemRequestDto = {
  text: string;
};

export type UpdateChecklistItemRequestDto = {
  text?: string;
  checked?: boolean;
};

export function toPublicChecklistItemDto(
  item: ChecklistItemView,
): PublicChecklistItemDto {
  return {
    id: item.id,
    checklistId: item.checklistId,
    text: item.text,
    checked: item.checked,
    createdAt: item.createdAt.toISOString(),
  };
}

export function toPublicChecklistDto(
  checklist: ChecklistView,
): PublicChecklistDto {
  return {
    id: checklist.id,
    taskId: checklist.taskId,
    name: checklist.name,
    createdAt: checklist.createdAt.toISOString(),
    items: checklist.items.map(toPublicChecklistItemDto),
    itemCount: checklist.itemCount,
    checkedCount: checklist.checkedCount,
  };
}
