const { iconTextBtn } = require("./action-buttons");
const { contactAvatar } = require("./avatar");

// Edit form — Figma "Contact — Multi-Action" (node 775:149791).
// `_readEditFields` (index.js) reads the values back through the
// `data-field` / `data-row-kind` attributes set here, so keep them in sync.
module.exports = function (ui, contact, ctx) {
  const fig = ui.fig.family;
  const { fullName, contactId, editError } = ctx;
  const tags = ui.getTags();
  const editEmails = ui.getEditEmails();
  const editPhones = ui.getEditPhones();
  const editTags = ui.getEditTags();
  const submitting = ui.isEditSubmitting();

  const label = (content) =>
    Skeletons.Note({ className: `${fig}__modal-label`, content });

  // Row delete (×) for extra emails/phones and assigned tag chips.
  const removeBtn = (service, extra, variant = "") =>
    Skeletons.Button.Svg({
      ico: "ph-x",
      className: `${fig}__row-remove${variant}`,
      bubble: 0,
      service,
      uiHandler: [ui],
      ...extra,
    });

  // `placeholder` is not optional: ui-core's entry widget falls back to
  // LOCALE.FORM_ENTRY when none is given, so an unset placeholder renders a
  // generic hint in a field that already carries its own label above it.
  const labeledInput = (text, name, value) =>
    Skeletons.Box.Y({
      className: `${fig}__edit-field`,
      dataset: { field: name },
      kids: [
        label(text),
        Skeletons.Entry({
          className: `${fig}__modal-input`,
          formItem: name,
          attribute: { name },
          value: value || "",
          placeholder: text,
          require: "any",
          bubble: 0,
        }),
      ],
    });

  const labeledTextarea = (text, name, value, placeholder) =>
    Skeletons.Box.Y({
      className: `${fig}__edit-field`,
      dataset: { field: name },
      kids: [
        label(text),
        Skeletons.Textarea({
          className: `${fig}__modal-textarea`,
          formItem: name,
          value: value || "",
          placeholder,
          require: "any",
          rows: 3,
          ignoreEnter: true,
          bubble: 0,
        }),
      ],
    });

  const emailRow = (e, idx) => {
    const isDefault = e.is_default === 1;
    return Skeletons.Box.X({
      className: `${fig}__edit-row`,
      dataset: {
        // Use kebab key — the framework writes `data-${k}` verbatim, so a
        // camelCase `rowKind` produces `data-rowkind` (lowercased by the
        // browser), which the `[data-row-kind=…]` selector wouldn't match.
        "row-kind": "email",
        default: isDefault ? 1 : 0,
        category: e.category || "priv",
      },
      kids: [
        Skeletons.Entry({
          className: `${fig}__modal-input`,
          formItem: `email_${idx}`,
          value: e.email || "",
          placeholder: LOCALE.CONTACT_EMAIL_ADDRESS,
          require: "any",
          bubble: 0,
          // Default email is read-only and cannot be removed — to change it,
          // add a new email and mark it as the new default.
          readonly: isDefault ? 1 : undefined,
          dataset: isDefault ? { disabled: 1 } : undefined,
        }),
        isDefault ? null : removeBtn("edit-remove-email", { rowIndex: idx }),
      ].filter(Boolean),
    });
  };

  const phoneRow = (p, idx) =>
    Skeletons.Box.X({
      className: `${fig}__edit-row`,
      dataset: { "row-kind": "phone", category: p.category || "priv" },
      kids: [
        Skeletons.Entry({
          className: `${fig}__modal-input ${fig}__modal-input--narrow`,
          formItem: `areacode_${idx}`,
          value: p.areacode || "",
          placeholder: "+00",
          require: "any",
          bubble: 0,
        }),
        Skeletons.Entry({
          className: `${fig}__modal-input`,
          formItem: `phone_${idx}`,
          value: p.phone || "",
          placeholder: LOCALE.PHONE_NUMBER,
          require: "any",
          bubble: 0,
        }),
        removeBtn("edit-remove-phone", { rowIndex: idx }),
      ],
    });

  const addRowBtn = (text, service) =>
    Skeletons.Note({
      className: `${fig}__row-add`,
      content: `+ ${text}`,
      bubble: 0,
      service,
      uiHandler: [ui],
    });

  const emailSection = Skeletons.Box.Y({
    className: `${fig}__edit-list`,
    kids: [
      label(LOCALE.EMAIL),
      ...editEmails.map(emailRow),
      addRowBtn(LOCALE.CONTACT_EMAIL_ADDRESS, "edit-add-email"),
    ],
  });

  const phoneSection = Skeletons.Box.Y({
    className: `${fig}__edit-list`,
    kids: [
      label(LOCALE.MOBILE),
      ...editPhones.map(phoneRow),
      addRowBtn(LOCALE.PHONE_NUMBER, "edit-add-phone"),
    ],
  });

  // Only the contact's own tags, each with × to unassign (applied on Save).
  // "Add" assigns an existing tag of that name or creates it (_createTag).
  const assigned = tags.filter((t) => editTags.includes(t.tag_id));
  const tagSection = Skeletons.Box.Y({
    className: `${fig}__edit-list`,
    kids: [
      label(LOCALE.TAGS || "Tags"),
      assigned.length
        ? Skeletons.Box.X({
            className: `${fig}__tag-chips`,
            kids: assigned.map((t) =>
              Skeletons.Box.X({
                className: `${fig}__tag-chip`,
                kids: [
                  Skeletons.Note({
                    className: `${fig}__tag-chip-label`,
                    content: t.name || t.tag_name || "",
                  }),
                  removeBtn("edit-toggle-tag", { tagId: t.tag_id }, ` ${fig}__row-remove--chip`),
                ],
              })
            ),
          })
        : null,
      Skeletons.Box.X({
        className: `${fig}__new-tag-input`,
        kids: [
          Skeletons.Entry({
            className: `${fig}__modal-input`,
            formItem: "new_tag_name",
            placeholder: LOCALE.NEW_TAG || "New tag",
            require: "any",
            mode: "commit",
            bubble: 0,
            service: "create-tag",
            uiHandler: [ui],
          }),
          iconTextBtn(fig, "primary", "ph-plus", LOCALE.ADD || "Add", "create-tag", {}, ui),
        ],
      }),
    ].filter(Boolean),
  });

  return Skeletons.Box.Y({
    // `--edit` scopes the Figma form styles; the invite/import modals share
    // `__modal-label` / `__modal-input` and keep their own look.
    className: `${fig}__detail-panel ${fig}__detail-panel--edit`,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__detail-header`,
        kids: [
          contactAvatar(ui, contact, fullName, "detail"),
          Skeletons.Note({
            className: `${fig}__detail-name`,
            content: LOCALE.EDIT_CONTACT,
          }),
        ],
      }),
      editError
        ? Skeletons.Note({ className: `${fig}__modal-error`, content: editError })
        : null,
      Skeletons.Box.Y({
        className: `${fig}__edit-form`,
        kids: [
          labeledInput(LOCALE.FIRSTNAME, "firstname", ui.getEditFirstname()),
          labeledInput(LOCALE.LASTNAME, "lastname", ui.getEditLastname()),
          emailSection,
          phoneSection,
          tagSection,
          labeledTextarea(LOCALE.NOTE, "comment", ui.getEditComment(), LOCALE.CONTACT_NOTE_PLACEHOLDER),
        ],
      }),
      Skeletons.Box.Y({
        className: `${fig}__detail-actions`,
        kids: [
          iconTextBtn(
            fig,
            "primary",
            "ph-floppy-disk",
            submitting ? (LOCALE.SAVING || `${LOCALE.SAVE}…`) : LOCALE.SAVE_CHANGE,
            submitting ? null : "save-edit",
            submitting
              ? { state: 0, dataset: { disabled: 1, loading: 1 }, contactId }
              : { contactId },
            ui,
          ),
          iconTextBtn(
            fig,
            "neutral",
            null,
            LOCALE.CANCEL,
            submitting ? null : "cancel-edit",
            submitting ? { state: 0, dataset: { disabled: 1 } } : {},
            ui,
          ),
        ],
      }),
    ].filter(Boolean),
  });
};
