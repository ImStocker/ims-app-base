{
  function createExpr(params){
    const res = params;
    if (options.trackLocations){
      const loc = location();
      return {
        ...params,
        location: {
          start: loc.start,
          end: loc.end
        }
      }
    }
    else return res;
  }

  function makeFilter(path, operator, value) {
    return createExpr({
      type: 'filter',
      path: path,
      op: operator,
      value: value
    })
  }

  function makeOp(operator, left, right) {
    return createExpr({
      type: operator,
      left: left,
      right: right
    });
  }
  
  function makeQuery(value) {
    return createExpr({
      type: 'query',
      content: value
    });
  }
  
  function makeNot(expression) {
    return createExpr({
      type: 'not',
      target: expression
    });
  }

  function makeGroup(target) {
    return createExpr({
      type: 'group',
      target: target
    })
  }

  function makeRange(start, end){
    return createExpr({ 
      type: 'range', 
      start: start, 
      end: end 
    })
  }
  
  function makeConst(value, kind){
    return createExpr({ 
      type: 'const', 
      content: value,
      kind: kind
    })
  }
  
}

Start
  = _ expression:Expression _ EOF { return expression; }

Expression
  = LogicalOrExpression

LogicalOrExpression
  = left:LogicalAndExpression __ "OR"i __ right:LogicalOrExpression { return makeOp('or', left, right); }
  / LogicalAndExpression

LogicalAndExpression
  = left:MultiExpression __ "AND"i __ right:LogicalAndExpression { return makeOp('and', left, right); }
  / MultiExpression
  
MultiExpression
  = exp1: NotExpression __ exp2: MultiExpression { 
    if (exp1.type === 'query' && exp2.type === 'query'){
      return makeQuery(exp1.content + ' ' + exp2.content)
    }
    else if (exp1.type === 'query' && exp2.type === 'and' && exp2.left.type === 'query'){
      const res = createExpr({
        ...exp2,
        left: makeQuery(exp1.content + ' ' + exp2.left.content)
      })
      if (options.trackLocations){
        const loc = location();
        res.left.location = {
          start: loc.start,
          end: exp2.left.location.end
        }
      }
      return res;
    }
    else {
      return makeOp('and', exp1, exp2)
    }
   }
  / NotExpression
  
NotExpression
  = "NOT"i _ expression:NotExpression { return makeNot(expression); }
  / PrimaryExpression
  
PrimaryExpression
  = "(" _ expression:LogicalOrExpression _ ")" { return makeGroup(expression); }
  / FilterExpression
  / QueryExpression

FilterExpression
  = field:FilterPath &{ 
    if (!options.rootFilters){
      return true
    }
    return options.rootFilters.includes(field[0]) || field.length > 1
  } operator:Operator value:Value { return makeFilter(field, operator, value); }

FilterPath
  = field:FieldIdenifier sub:("[" (StringLiteral / NumberLiteral) "]")* rest:("." FilterPath)? {
     return [field, ...sub.map(s => s[1].content), ...(rest ? rest[1] : [])]
   }

FieldIdenifier
  = $([\p{L}_]iu[\p{L}0-9_]iu*) { return text(); }

Operator
  = _ ":>=" _ { return '>='; }
  / _ ":<=" _ { return '<='; }
  / _ ":<>" _ { return '!='; }
  / _ ":>" _ { return '>'; }
  / _ ":<" _ { return '<'; }
  / _ ":" _ { return '='; }

Value
  = StringLiteral 
  / UuidLiteral
  / DateLiteral
  / NumberLiteral
  / BooleanLiteral
  / NullLiteral
  / RangeLiteral
  / $([a-zA-Z0-9_-]+) { return makeConst(text(), 'string'); }

QueryExpression
  = value:QueryValue { return makeQuery(value); }

QueryValue
  = !(("OR"i / "AND"i / "NOT"i) __ / "(" / "'" / "\"") $([^ \t\n\r)]+) { return text(); }  // Match any characters except whitespace and special chars
  / StringLiteral

StringLiteral
  = '"' chars:DoubleStringChar* '"' { return makeConst(chars.join(''), 'string') }
  / "'" chars:SingleStringChar* "'" { return makeConst(chars.join(''), 'string') }

DoubleStringChar
  = [^"\\] { return text(); }
  / "\\" sequence:EscapeSequence { return sequence; }

SingleStringChar
  = [^'\\] { return text(); }
  / "\\" sequence:EscapeSequence { return sequence; }

EscapeSequence
  = [\\/bfnrt'"] { 
      const escapeMap = {
        '"': '"',
        "'": "'",
        "\\": "\\",
        "/": "/",
        "b": "\b",
        "f": "\f",
        "n": "\n",
        "r": "\r",
        "t": "\t"
      };
      return escapeMap[text()];
    }
  / "u" digits:$([0-9a-fA-F]{4}) { 
      return String.fromCharCode(parseInt(digits, 16)); 
    }

NumberLiteral
  = minus:"-"? integer:[0-9]+ fraction:("." [0-9]+)? { 
      if (fraction){
        return makeConst(
          parseFloat((minus ? "-" : "") + integer.join("") + (fraction ? "." + fraction[1].join("") : "")),
          'float'
        );
      } else {
        return makeConst(
          parseInt((minus ? "-" : "") + integer.join("")),
          'int'
        );
      }
    }

BooleanLiteral
  = "true"i { return makeConst(true, 'bool'); }
  / "false"i { return makeConst(false, 'bool'); }

DateLiteral
  = value:([0-9] |4| "-" [0-9] |2| "-" [0-9] |2| { return text() })
  & {
    return !isNaN(new Date(value))
  } { 
      return makeConst(value, 'date'); 
  }

UuidLiteral
 = [0-9a-f] |8| "-" [0-9a-f] |4| "-" [0-9a-f] |4| "-" [0-9a-f] |4| "-" [0-9a-f] |12| { return makeConst(text(), 'uuid') }

NullLiteral
  = "null"i { return makeConst(null, 'null'); }

RangeLiteral
  = "[" _ start:Value _ ".." _ end:Value _ "]" { 
      return makeRange(start, end); 
    }

__
  = [ \t\n\r]+
_
  = [ \t\n\r]*

EOF
  = !.