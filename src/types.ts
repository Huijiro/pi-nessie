import { Type } from "typebox";

export const NodeSchema = Type.Object({
	id: Type.String(),
	name: Type.String(),
	kind: Type.String(),
	emoji: Type.String(),
	isContainer: Type.Boolean(),
	childCount: Type.Number(),
	ownerEmail: Type.String(),
	ownership: Type.String(),
	initiated: Type.Union([Type.String(), Type.Null()]),
	createdAt: Type.String(),
	updatedAt: Type.String(),
});

export const GrepMatchSchema = Type.Object({
	sliceId: Type.String(),
	matchedField: Type.String(),
	score: Type.Number(),
	body: Type.String(),
	node: NodeSchema,
});
