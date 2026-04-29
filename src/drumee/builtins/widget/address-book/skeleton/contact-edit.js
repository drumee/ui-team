module.exports = function (ui, contact, ctx) {
  const fig = ui.fig.family;
  const { initials, contactId, editError } = ctx;
  const tags = ui.getTags();
  const editEmails = ui.getEditEmails();
  const editPhones = ui.getEditPhones();
  const editTags = ui.getEditTags();

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

  const emailRow = (e, idx) =>
    Skeletons.Box.X({
      className: `${fig}__edit-row`,
      dataset: {
        rowKind: "email",
        default: e.is_default === 1 ? 1 : 0,
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
        }),
        Skeletons.Note({
          className: `${fig}__row-pill`,
          dataset: { active: e.is_default === 1 ? 1 : 0 },
          content: LOCALE.DEFAULT,
          bubble: 0,
          service: "edit-set-default-email",
          uiHandler: [ui],
          rowIndex: idx,
        }),
        Skeletons.Note({
          className: `${fig}__row-remove`,
          content: "×",
          bubble: 0,
          service: "edit-remove-email",
          uiHandler: [ui],
          rowIndex: idx,
        }),
      ],
    });

  const phoneRow = (p, idx) =>
    Skeletons.Box.X({
      className: `${fig}__edit-row`,
      dataset: { rowKind: "phone", category: p.category || "priv" },
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
      Skeletons.Note({ className: `${fig}__modal-label`, content: LOCALE.TAGS || "Tags" }),
      Skeletons.Box.X({
        className: `${fig}__tag-picker`,
        kids: [
          ...tags.map((t) =>
            Skeletons.Note({
              className: `${fig}__tag-chip`,
              dataset: { active: editTags.includes(t.tag_id) ? 1 : 0 },
              content: t.name || t.tag_name || "",
              bubble: 0,
              service: "edit-toggle-tag",
              uiHandler: [ui],
              tagId: t.tag_id,
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
            styleOpt: { background: contact.color || "#fa8540" },
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
          labeledInput(LOCALE.FIRSTNAME, "firstname", contact.firstname),
          labeledInput(LOCALE.LASTNAME, "lastname", contact.lastname),
          emailSection,
          phoneSection,
          tagSection,
          labeledTextarea(LOCALE.COMMENT, "comment", contact.comment),
        ],
      }),
      Skeletons.Box.X({
        className: `${fig}__detail-actions`,
        kids: [
          Skeletons.Note({
            className: `${fig}__btn ${fig}__btn--secondary`,
            content: LOCALE.CANCEL,
            bubble: 0,
            service: "cancel-edit",
            uiHandler: [ui],
          }),
          Skeletons.Note({
            className: `${fig}__btn ${fig}__btn--primary`,
            content: LOCALE.SAVE,
            bubble: 0,
            service: "save-edit",
            uiHandler: [ui],
            contactId,
          }),
        ],
      }),
    ].filter(Boolean),
  });
};
