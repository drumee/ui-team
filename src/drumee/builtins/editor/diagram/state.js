const go = require("gojs");
const {
  Adornment,
  Animation,
  AnimationManager,
  Binding,
  Brush,
  Diagram,
  Link,
  Node,
  Panel,
  Placeholder,
  Point,
  Shape,
  Size,
  Spot,
  TextBlock,
  ToolManager,
  GraphObject,
} = go;
const { make } = GraphObject;


class __diagram_state extends DrumeeMFS {
  /**
   *
   */
  initialize(opt = {}) {
    super.initialize(opt);
    this.media = opt.media;
    let {nid, pid, hub_id} = this.media.actualNode();
    this.mset({nid, pid, hub_id});
  }

  /**
   *
   */
  onDomRefresh() {
    if(!this.media){
      this.warn("EEE:42 -- Require media reference");
      return;
    }
    let responseType = _a.text;
    this.media.wait(0);
    let { url } = this.media.actualNode();
    this.diagramId = `${this.mget(_a.widgetId)}-diagram-state`;
    this.el.setAttribute(_a.id, this.diagramId);

    Utils.fetch(url, { responseType }).then((content) => {
      Utils.waitForEl(this.diagramId, () => {
        this.createDiagram();
        this.load(content)
      });
    });
  }

  /*
   *
   */
  createDiagram() {
    // some constants that will be reused within templates
    //const make = GraphObject.make;
    this._diagram = make(
      Diagram,
      this.diagramId, // must name or refer to the DIV HTML element
      {
        "animationManager.initialAnimationStyle": AnimationManager.None,
        InitialAnimationStarting: (e) => {
          let animation = e.subject.defaultAnimation;
          animation.easing = Animation.EaseOutExpo;
          animation.duration = 900;
          //animation.add(e.diagram, "scale", 0.1, 1);
          animation.add(e.diagram, "opacity", 0, 1);
        },

        // have mouse wheel events zoom in and out instead of scroll up and down
        "toolManager.mouseWheelBehavior": ToolManager.WheelZoom,
        // support double-click in background creating a new node
        "clickCreatingTool.archetypeNodeData": { text: "new node" },
        // enable undo & redo
        "undoManager.isEnabled": true,
        positionComputation: (diagram, pt) => {
          return new Point(Math.floor(pt.x), Math.floor(pt.y));
        },
      }
    );

    this.makeNode();
    this.makeAdornment();
    this.addSpot();
    this.addSpot({ label: "End", fill: "maroon" });
    this.makeLink();
  }

  /**
   * clicking the button inserts a new node to the right of the selected node,
   * and adds a link to that new node
   * @param {*} e
   * @param {*} obj
   */
  addNodeAndLink(e, obj) {
    let adornment = obj.part;
    let diagram = e.diagram;
    diagram.startTransaction("Add State");

    // get the node data for which the user clicked the button
    let fromNode = adornment.adornedPart;
    let fromData = fromNode.data;
    // create a new "State" data object, positioned off to the right of the adorned Node
    let toData = { text: "new" };
    let p = fromNode.location.copy();
    p.x += 200;
    toData.loc = Point.stringify(p); // the "loc" property is a string, not a Point object
    // add the new node data to the model
    let model = diagram.model;
    model.addNodeData(toData);

    // create a link data from the old node data to the new node data
    let linkdata = {
      from: model.getKeyForNodeData(fromData), // or just: fromData.id
      to: model.getKeyForNodeData(toData),
      text: "transition",
    };
    // and add the link data to the model
    model.addLinkData(linkdata);

    // select the new Node
    let newnode = diagram.findNodeForData(toData);
    diagram.select(newnode);

    diagram.commitTransaction("Add State");

    // if the new node is off-screen, scroll the diagram to show the new node
    diagram.scrollToRect(newnode.actualBounds);
  }

  /**
   * define the Node template
   * @param {*} view
   */
  makeNode() {
    let roundedRectangleParams = {
      parameter1: 2, // set the rounded corner
      spot1: Spot.TopLeft,
      spot2: Spot.BottomRight, // make content go all the way to inside edges of rounded corners
    };

    this._diagram.nodeTemplate = make(
      Node,
      "Auto",
      {
        locationSpot: Spot.Top,
        isShadowed: true,
        shadowBlur: 1,
        shadowOffset: new Point(0, 1),
        shadowColor: "rgba(0, 0, 0, .14)",
      },
      new Binding("location", "loc", Point.parse).makeTwoWay(Point.stringify),
      // define the node's outer shape, which will surround the TextBlock
      make(Shape, "RoundedRectangle", roundedRectangleParams, {
        name: "SHAPE",
        fill: "#ffffff",
        strokeWidth: 0,
        stroke: null,
        portId: "", // this Shape is the Node's port, not the whole Node
        fromLinkable: true,
        fromLinkableSelfNode: true,
        fromLinkableDuplicates: true,
        toLinkable: true,
        toLinkableSelfNode: true,
        toLinkableDuplicates: true,
        cursor: "pointer",
      }),
      make(
        TextBlock,
        {
          font: "bold small-caps 11pt helvetica, bold arial, sans-serif",
          margin: 7,
          stroke: "rgba(0, 0, 0, .87)",
          editable: true, // editing the text automatically updates the model data
        },
        new Binding("text").makeTwoWay()
      )
    );
  }

  /**
   * unlike the normal selection Adornment, this one includes a Button
   */
  makeAdornment() {
    let roundedRectangleParams = {
      parameter1: 2, // set the rounded corner
      spot1: Spot.TopLeft,
      spot2: Spot.BottomRight, // make content go all the way to inside edges of rounded corners
    };
    this._diagram.nodeTemplate.selectionAdornmentTemplate = make(
      Adornment,
      "Spot",
      make(
        Panel,
        "Auto",
        make(Shape, "RoundedRectangle", roundedRectangleParams, {
          fill: null,
          stroke: "#7986cb",
          strokeWidth: 3,
        }),
        make(Placeholder) // a Placeholder sizes itself to the selected Node
      ),
      // the button to create a "next" node, at the top-right corner
      make(
        "Button",
        {
          alignment: Spot.TopRight,
          click: this.addNodeAndLink.bind(this),
        },
        make(Shape, "PlusLine", { width: 6, height: 6 })
      )
    );
  }

  /**
   *
   * @param {*} opt
   */
  addSpot(opt) {
    let { stroke, font, label, type, shape, fill, cursor } = {
      label: "Start",
      type: "Spot",
      shape: "circle",
      fill: "green",
      font: "bold 16pt helvetica, bold arial, sans-serif",
      stroke: "whitesmoke",
      ...opt,
    };
    this._diagram.nodeTemplateMap.add(
      label,
      make(
        Node,
        type,
        { desiredSize: new Size(75, 75) },
        new Binding("location", "loc", Point.parse).makeTwoWay(Point.stringify),
        make(Shape, shape, {
          fill,
          stroke: null,
          portId: "",
          fromLinkable: true,
          fromLinkableSelfNode: true,
          fromLinkableDuplicates: true,
          toLinkable: true,
          toLinkableSelfNode: true,
          toLinkableDuplicates: true,
          cursor,
        }),
        make(TextBlock, label, { font, stroke })
      )
    );
  }

  /**
   *
   */
  makeLink() {
    this._diagram.linkTemplate = make(
      Link, // the whole link panel
      {
        curve: Link.Bezier,
        adjusting: Link.Stretch,
        reshapable: true,
        relinkableFrom: true,
        relinkableTo: true,
        toShortLength: 3,
      },
      new Binding("points").makeTwoWay(),
      new Binding("curviness"),
      make(
        Shape, // the link shape
        { strokeWidth: 1.5 },
        new Binding("stroke", "progress", (progress) =>
          progress ? "#52ce60" /* green */ : "black"
        ),
        new Binding("strokeWidth", "progress", (progress) =>
          progress ? 2.5 : 1.5
        )
      ),
      make(
        Shape, // the arrowhead
        { toArrow: "standard", stroke: null },
        new Binding("fill", "progress", (progress) =>
          progress ? "#52ce60" /* green */ : "black"
        )
      ),
      make(
        Panel,
        "Auto",
        make(
          Shape, // the label background, which becomes transparent around the edges
          {
            fill: make(Brush, "Radial", {
              0: "rgb(245, 245, 245)",
              0.7: "rgb(245, 245, 245)",
              1: "rgba(245, 245, 245, 0)",
            }),
            stroke: null,
          }
        ),
        make(
          TextBlock,
          "transition", // the label text
          {
            textAlign: "center",
            font: "9pt helvetica, arial, sans-serif",
            margin: 4,
            editable: true, // enable in-place editing
          },
          // editing the text automatically updates the model data
          new Binding("text").makeTwoWay()
        )
      )
    );
  }
  // Show the diagram's model in JSON format
  save() {
    let content = this._diagram.model.toJson();
    let {nid, pid, hub_id} = this.media.actualNode();
    let opt = {
      service: SERVICE.media.save,
      nid,
      id: nid,
      hub_id,
      content,
      filename : `${this.media.mget(_a.filename)}.${this.media.mget(_a.ext)}`,
      metadata: {
        dataType : "diagram.state"
      }
    };
    this.postService(opt, { async: 1 });
    this._diagram.isModified = false;
  }

  /**
   * 
   * @param {*} data 
   */
  load(data) {
    this._diagram.model = go.Model.fromJson(data);
  }
}

export default __diagram_state;
