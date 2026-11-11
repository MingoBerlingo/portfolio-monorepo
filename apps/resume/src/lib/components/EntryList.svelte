<script lang="ts">
  import { DragDropProvider } from "@dnd-kit/svelte";
  import { isSortable } from "@dnd-kit/svelte/sortable";
  import type { ComponentProps } from "svelte";
  import type {
    ResumeDocument,
    CollectionKey,
    Experience,
    Education,
    Research,
  } from "../../types.ts";
  import DragPreview from "./DragPreview.svelte";
  import SortableBlock from "./SortableBlock.svelte";
  import Icon from "./Icon.svelte";
  import { formatResumeDate, formatResumeRange } from "../../dates.ts";
  import Editable from "./Editable.svelte";
  import ExperienceBullets from "./ExperienceBullets.svelte";
  type Props = ComponentProps<typeof DragDropProvider>;
  let {
    doc,
    collection,
    disabled,
    active = true,
    selectedBlock = null,
    onblockselect,
    ontransaction,
    onchange,
    ontext,
    onsplit,
    onmerge,
    onreorderbullets,
    ondetails,
    onadd,
    onremove,
  }: {
    doc: ResumeDocument;
    collection: CollectionKey;
    disabled: boolean;
    active?: boolean;
    selectedBlock?: string | null;
    onblockselect?: (key: string | null) => void;
    ontransaction?: (transaction: "begin" | "commit" | "cancel") => void;
    onchange: (key: CollectionKey, from: number, to: number) => void;
    ontext: (path: string, v: string, line?: number) => void;
    onsplit: (p: string, l: number, o: number) => void;
    onmerge: (p: string, l: number) => void;
    onreorderbullets: (path: string, value: string) => void;
    ondetails: (type: "dates" | "link", path: string) => void;
    onadd: (key: CollectionKey) => void;
    onremove: (key: CollectionKey, i: number) => void;
  } = $props();
  let ids = $state<string[]>([]),
    snapshot: string[] = [],
    draggedId: string | null = null;
  $effect(() => {
    if (ids.length !== doc[collection].length)
      ids = doc[collection].map(
        (_: unknown, i: number) => ids[i] ?? crypto.randomUUID(),
      );
  });
  function date(value: string) {
    try {
      return formatResumeDate(value, doc.locale);
    } catch {
      return value;
    }
  }
  function period(entry: Experience | Education) {
    try {
      return formatResumeRange(
        entry.startDate,
        entry.endDate,
        doc.locale,
        collection === "experiences",
      );
    } catch {
      return [entry.startDate, entry.endDate].filter(Boolean).join(" – ");
    }
  }
  const over: Props["onDragOver"] = (event) => {
    const { source, target } = event.operation;
    if (
      !isSortable(source) ||
      !isSortable(target) ||
      source.index === target.index
    )
      return;
    move(source.index, target.index);
  };
  function move(from: number, to: number) {
    const copy = [...ids];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    ids = copy;
    onchange(collection, from, to);
    // Selection uses the current path, while the sortable identity stays with the entry.
    onblockselect?.(`entry:${collection}.${to}`);
  }
  function remove(i: number) {
    if (!confirm("Remove this entry from this working copy?")) return;
    ids = ids.filter((_, n) => n !== i);
    onremove(collection, i);
  }
  const end: Props["onDragEnd"] = (event) => {
    if (event.canceled) {
      for (let i = 0; i < snapshot.length; i++) {
        const from = ids.indexOf(snapshot[i]);
        if (from !== i) {
          const copy = [...ids];
          const [v] = copy.splice(from, 1);
          copy.splice(i, 0, v);
          ids = copy;
          onchange(collection, from, i);
        }
      }
    }
    ontransaction?.(event.canceled ? "cancel" : "commit");
    if (draggedId !== null) {
      const index = ids.indexOf(draggedId);
      if (index >= 0) onblockselect?.(`entry:${collection}.${index}`);
    }
    draggedId = null;
  };
</script>

<DragDropProvider
  onDragStart={(event) => {
    snapshot = [...ids];
    draggedId = event.operation.source
      ? String(event.operation.source.id)
      : null;
    const index = draggedId === null ? -1 : ids.indexOf(draggedId);
    if (index >= 0) onblockselect?.(`entry:${collection}.${index}`);
    ontransaction?.("begin");
  }}
  onDragOver={over}
  onDragEnd={end}
>
  {#each ids as id, i (id)}
    {@const e = doc[collection][i]}
    {#if e}
      <SortableBlock
        {id}
        index={i}
        group={collection}
        path={`${collection}.${i}`}
        label={`${collection} entry ${i + 1}`}
        {disabled}
        selected={selectedBlock === `entry:${collection}.${i}`}
        onselect={() => onblockselect?.(`entry:${collection}.${i}`)}
        canMoveUp={i > 0}
        canMoveDown={i < ids.length - 1}
        onmove={(direction) => {
          move(i, i + direction);
        }}
        ondelete={() => remove(i)}
      >
        <h3>
          {#if collection === "experiences"}<Editable
              path={`${collection}.${i}.role`}
              value={(e as Experience).role}
              label="Role"
              {disabled}
              onchange={ontext}
            /> – <Editable
              path={`${collection}.${i}.company`}
              value={(e as Experience).company}
              label="Company"
              {disabled}
              onchange={ontext}
            />{:else}<Editable
              path={`${collection}.${i}.title`}
              value={(e as Education).title}
              label={collection === "education" ? "Qualification" : "Title"}
              {disabled}
              onchange={ontext}
            />{/if}
        </h3>
        {#if collection !== "publications"}
          <p class="date">
            {#if collection === "research"}{date(
                (e as Research).date,
              )}{:else}{period(e as Experience | Education)}{/if}<button
              type="button"
              class="detail-button"
              data-details="dates"
              data-path={`${collection}.${i}`}
              onclick={() => ondetails("dates", `${collection}.${i}`)}
              aria-label="Edit dates"
              title="Edit dates"
              {disabled}><Icon name="pen" /></button
            >
          </p>
        {/if}
        {#if collection === "experiences"}
          <p class="sectors">
            <span class="contact-label"
              >{doc.locale === "it" ? "Settore" : "Sectors"}:</span
            >
            <Editable
              path={`${collection}.${i}.industries`}
              value={(e as Experience).industries
                .split("\n")
                .filter(Boolean)
                .join(", ")}
              label="Industries"
              {disabled}
              onchange={ontext}
            />
          </p>
        {:else if collection === "education"}<Editable
            tag="div"
            path={`${collection}.${i}.school`}
            value={(e as Education).school}
            label="School"
            {disabled}
            onchange={ontext}
          />
        {:else}<Editable
            tag="div"
            multiline
            path={`${collection}.${i}.description`}
            value={(e as Research).description}
            label="Description"
            {disabled}
            onchange={ontext}
          />
          <div class="entry-link">
            <Editable
              path={`${collection}.${i}.url`}
              value={(e as Research).url}
              label="URL"
              {disabled}
              onchange={ontext}
            /><button
              class="detail-button"
              type="button"
              data-details="link"
              data-path={`${collection}.${i}`}
              onclick={() => ondetails("link", `${collection}.${i}`)}
              {disabled}
              aria-label="Edit link"
              title="Edit link"><Icon name="pen" /></button
            >
          </div>{/if}
        {#if collection === "experiences" || collection === "education"}
          {@const key = collection === "experiences" ? "activities" : "details"}
          {@const bullets = (
            collection === "experiences"
              ? (e as Experience).activities
              : (e as Education).details
          ).split("\n")}
          {#if collection === "experiences"}
            <ExperienceBullets path={`${collection}.${i}.${key}`} {bullets} {disabled}
              {ontext} {onsplit} {onmerge} onreorder={onreorderbullets} />
          {:else}
          <ul>
            {#each bullets as bullet, line}<Editable
                tag="li"
                path={`${collection}.${i}.${key}`}
                value={bullet}
                label="Education detail"
                {line}
                {disabled}
                onchange={ontext}
                {onsplit}
                {onmerge}
              />{/each}
          </ul>
          {/if}
          <button
            class="add-bullet"
            type="button"
            data-action="bullet-add"
            data-path={`${collection}.${i}.${key}`}
            {disabled}
            onclick={() =>
              ontext(`${collection}.${i}.${key}`, bullets.join("\n") + "\n")}
            ><Icon name="add" /> Bullet</button
          >
        {/if}
      </SortableBlock>
    {/if}
  {/each}
  <DragPreview />
</DragDropProvider>
<button
  class="add-entry"
  type="button"
  data-action="add"
  data-key={collection}
  {disabled}
  onclick={() => onadd(collection)}><Icon name="add" /> Add entry</button
>
