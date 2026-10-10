
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type MemoryType =
  | "semantic"
  | "episodic"
  | "procedural"
  | "conversation";

@Entity({ name: "memories" })
export class Memory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "owner_id", type: "varchar", length: 100 })
  ownerId!: string;

  @Column({ type: "varchar", length: 30 })
  type!: MemoryType;

  @Column({ type: "text" })
  content!: string;

  @Column({
    type: "vector",
    length: 1536,
    nullable: true,
  })
  embedding!: number[] | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
