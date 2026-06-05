const { iconTextBtn } = require("./action-buttons");

module.exports = function (ui, contact, ctx) {
  const fig = ui.fig.family;
  const { initials, contactId, editError } = ctx;
  const tags = ui.getTags();
  const editEmails = ui.getEditEmails();
  const editPhones = ui.getEditPhones();
  const editTags = ui.getEditTags();
  const submitting = ui.isEditSubmitting();

  const labeledInput = (label, name, value) =>
    Skeletons.Box.Y({
      className: `${fig}__edit-field`,
      dataset: { field: name },
      kids: [
        Skeletons.Note({ className: `${fig}__modal-label`, content: label }),
        Skeletons.Entry({
          className: `${fig}__modal-input`,
          formItem: name,
          attribute: { name },
          value: value || "",
          require: "any",
          bubble: 0,
        }),
      ],
    });

  const labeledTextarea = (label, name, value) =>
    Skeletons.Box.Y({
      className: `${fig}__edit-field`,
      dataset: { field: name },
      kids: [
        Skeletons.Note({ className: `${fig}__modal-label`, content: label }),
        Skeletons.Textarea({
          className: `${fig}__modal-textarea`,
          formItem: name,
          value: value || "",
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
          placeholder: LOCALE.EMAIL_ADDRESS,
          require: "any",
          bubble: 0,
          // Default email is read-only and cannot be removed — to change it,
          // add a new email and mark it as the new default.
          readonly: isDefault ? 1 : undefined,
          dataset: isDefault ? { disabled: 1 } : undefined,
        }),
        isDefault
          ? Skeletons.Note({
              className: `${fig}__row-pill`,
              dataset: { active: 1 },
              content: LOCALE.DEFAULT,
              bubble: 0,
              uiHandler: [ui],
              rowIndex: idx,
            })
          : null,
        isDefault
          ? null
          : Skeletons.Note({
              className: `${fig}__row-remove`,
              content: "×",
              bubble: 0,
              service: "edit-remove-email",
              uiHandler: [ui],
              rowIndex: idx,
            }),
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
          placeholder: "+1",
          require: "any",
          bubble: 0,
        }),
        Skeletons.Entry({
          className: `${fig}__modal-input`,
          formItem: `phone_${idx}`,
          value: p.phone || "",
          placeholder: LOCALE.MOBILE,
          require: "any",
          bubble: 0,
        }),
        Skeletons.Note({
          className: `${fig}__row-remove`,
          content: "×",
          bubble: 0,
          service: "edit-remove-phone",
          uiHandler: [ui],
          rowIndex: idx,
        }),
      ],
    });

  const addRowBtn = (label, service) =>
    Skeletons.Note({
      className: `${fig}__row-add`,
      content: `+ ${label}`,
      bubble: 0,
      service,
      uiHandler: [ui],
    });

  const emailSection = Skeletons.Box.Y({
    className: `${fig}__edit-list`,
    kids: [
      Skeletons.Note({ className: `${fig}__modal-label`, content: LOCALE.EMAIL }),
      ...editEmails.map(emailRow),
      addRowBtn(LOCALE.EMAIL, "edit-add-email"),
    ],
  });

  const phoneSection = Skeletons.Box.Y({
    className: `${fig}__edit-list`,
    kids: [
      Skeletons.Note({ className: `${fig}__modal-label`, content: LOCALE.MOBILE }),
      ...editPhones.map(phoneRow),
      addRowBtn(LOCALE.MOBILE, "edit-add-phone"),
    ],
  });

  const tagSection = Skeletons.Box.Y({
    className: `${fig}__edit-list`,
    kids: [
      Skeletons.Box.X({
        className: `${fig}__edit-list-header`,
        kids: [
          Skeletons.Note({ className: `${fig}__modal-label`, content: LOCALE.TAGS || "Tags" }),
          Skeletons.Button.Svg({
            ico: "info",
            className: `${fig}__tag-help`,
            tooltips: {
              content: `<svg class="${fig}__tag-help-ico"><use href="#--icon-info"></use></svg><span>${LOCALE.TAGS_USAGE_GUIDE}</span>`,
              className: `${fig}__tag-help-tip`,
            },
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${fig}__tag-picker`,
        kids: [
          ...tags.map((t) =>
            Skeletons.Box.X({
              className: `${fig}__tag-chip-wrap`,
              dataset: { active: editTags.includes(t.tag_id) ? 1 : 0 },
              kids: [
                Skeletons.Note({
                  className: `${fig}__tag-chip`,
                  content: t.name || t.tag_name || "",
                  bubble: 0,
                  service: "edit-toggle-tag",
                  uiHandler: [ui],
                  tagId: t.tag_id,
                }),
                Skeletons.Note({
                  className: `${fig}__tag-chip-remove`,
                  content: "×",
                  bubble: 0,
                  service: "delete-tag",
                  uiHandler: [ui],
                  tagId: t.tag_id,
                }),
              ],
            })
          ),
          Skeletons.Box.X({
            className: `${fig}__new-tag-input`,
            kids: [
              Skeletons.Entry({
                className: `${fig}__modal-input ${fig}__modal-input--narrow`,
                formItem: "new_tag_name",
                placeholder: LOCALE.NEW_TAG || "New tag",
                require: "any",
                mode: "commit",
                bubble: 0,
                service: "create-tag",
                uiHandler: [ui],
              }),
              Skeletons.Note({
                className: `${fig}__row-add`,
                content: `+ ${LOCALE.ADD || "Add"}`,
                bubble: 0,
                service: "create-tag",
                uiHandler: [ui],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${fig}__detail-panel`,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__detail-header`,
        kids: [
          Skeletons.Box.Y({
            className: `${fig}__detail-avatar`,
            styleOpt: { background: contact.color || "#e4e3ff" },
            kids: [
              Skeletons.Note({
                className: `${fig}__detail-avatar-text`,
                content: initials,
              }),
            ],
          }),
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
          labeledTextarea(LOCALE.COMMENT, "comment", ui.getEditComment()),
        ],
      }),
      Skeletons.Box.X({
        className: `${fig}__detail-actions`,
        kids: [
          iconTextBtn(
            fig,
            "neutral",
            "cross",
            LOCALE.CANCEL,
            submitting ? null : "cancel-edit",
            submitting ? { state: 0, dataset: { disabled: 1 } } : {},
            ui,
          ),
          iconTextBtn(
            fig,
            "primary",
            "apps-floppy",
            submitting ? (LOCALE.SAVING || `${LOCALE.SAVE}…`) : LOCALE.SAVE,
            submitting ? null : "save-edit",
            submitting
              ? { state: 0, dataset: { disabled: 1, loading: 1 }, contactId }
              : { contactId },
            ui,
          ),
        ],
      }),
    ].filter(Boolean),
  });
};
