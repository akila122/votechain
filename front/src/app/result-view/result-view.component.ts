import { Component, OnInit, Input } from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';

@Component({
  selector: 'app-result-view',
  templateUrl: './result-view.component.html',
  styleUrls: ['./result-view.component.css'],
})
export class ResultViewComponent implements OnInit {
  @Input() data: any;

  view: any[] = [700, 400];

  showXAxis = true;
  showYAxis = true;
  gradient = false;
  showLegend = true;
  showXAxisLabel = true;
  xAxisLabel = 'Options';
  showYAxisLabel = true;
  yAxisLabel = 'Votes';

  colorScheme = {
    domain: this.generateColors(),
  };

  constructor() {}

  getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  generateColors(){
    let domain = [];
    for(let i=0; i<100; i++) domain.push(this.getRandomColor());
    return domain;
  }
  onSelect(event) {
    console.log(event);
  }
  ngOnInit(): void {}
}
